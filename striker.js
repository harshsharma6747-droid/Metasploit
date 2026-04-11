const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const CONFIG = {
    FB_STATE: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/global_state.json",
    FB_ASSETS: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/assets.json",
    BATCH_SIZE: 5 
};

async function updateLog(update) {
    await fetch("https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/system_logs.json", {
        method: 'PATCH',
        body: JSON.stringify({ ...update, last_update: Date.now() })
    });
}

async function strike() {
    console.log("🔱 G-GHOST CHRONOS: INITIATING...");
    await updateLog({ status: "RUNNING", current_task: "Fetching Queue" });
    
    const res = await fetch(CONFIG.FB_STATE);
    let state = await res.json();
    
    if (!state || !state.queue || state.queue.length === 0) {
        await updateLog({ status: "IDLE", current_task: "Queue Empty" });
        return;
    }

    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    for (let i = 0; i < Math.min(CONFIG.BATCH_SIZE, state.queue.length); i++) {
        const target = state.queue[0];
        await updateLog({ current_task: `Processing: ${target.slice(-10)}` });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        try {
            await page.goto(`https://dyysy.com/?url=${encodeURIComponent(target)}`, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('video', { timeout: 35000 });
            
            const data = await page.evaluate(() => {
                const vEl = document.querySelector('video');
                return {
                    clean: vEl?.src || vEl?.querySelector('source')?.src,
                    thumb: vEl?.poster || document.querySelector('img[src*="thumb"]')?.src,
                    prompt: document.querySelector('#videoTitle, h1, .video-title')?.innerText || "Untitled_Asset"
                };
            });

            if (data.clean && data.clean.startsWith('http')) {
                await fetch(CONFIG.FB_ASSETS, {
                    method: 'POST',
                    body: JSON.stringify({ ...data, url: target, time: Date.now(), node: "GITHUB-STRIKER" })
                });
                state.queue.shift();
                state.history = state.history || [];
                state.history.push(target);
            } else {
                throw new Error("VIDEO_LINK_NOT_FOUND");
            }
        } catch (e) {
            await updateLog({ last_error: e.message });
            state.queue.push(state.queue.shift());
        }
        await page.close();
        await fetch(CONFIG.FB_STATE, { method: 'PUT', body: JSON.stringify(state) });
    }

    await browser.close();
    await updateLog({ status: "IDLE", current_task: "Mission Accomplished" });
}

strike();
