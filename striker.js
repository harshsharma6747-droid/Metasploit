const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const CONFIG = {
    FB_STATE: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/global_state.json",
    FB_ASSETS: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/assets.json"
};

async function strike() {
    console.log("🔱 G-GHOST CHRONOS: STARTING CLOUD MISSION...");
    
    // 1. Firebase से कतार (Queue) प्राप्त करें
    const res = await fetch(CONFIG.FB_STATE);
    const state = await res.json();
    
    if (!state || !state.queue || state.queue.length === 0) {
        console.log("❌ QUEUE EMPTY. STANDING BY.");
        return;
    }

    const target = state.queue[0]; // कतार का पहला लिंक
    console.log(`🎯 TARGET ACQUIRED: ${target}`);

    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        // 2. dyysy.com पर हमला
        await page.goto(`https://dyysy.com/?url=${encodeURIComponent(target)}`, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // वीडियो लोड होने का इंतज़ार करें
        await page.waitForSelector('video', { timeout: 30000 });
        
        const data = await page.evaluate(() => {
            const vEl = document.querySelector('video');
            return {
                clean: vEl?.src,
                thumb: vEl?.poster,
                prompt: document.querySelector('#videoTitle')?.innerText || "Untitled_Asset"
            };
        });

        if (data.clean && data.clean.includes('http')) {
            // 3. सफल लूट को Firebase में सेव करें
            await fetch(CONFIG.FB_ASSETS, {
                method: 'POST',
                body: JSON.stringify({ ...data, url: target, time: Date.now(), node: "GITHUB-STRIKER" })
            });

            // 4. कतार से लिंक हटाएँ और इतिहास (History) में डालें
            state.queue.shift();
            state.history = state.history || [];
            state.history.push(target);

            await fetch(CONFIG.FB_STATE.replace('.json', '') + ".json", {
                method: 'PUT',
                body: JSON.stringify(state)
            });

            console.log("✅ MISSION ACCOMPLISHED: ASSET VAULTED.");
        } else {
            throw new Error("ASSET_NOT_FOUND");
        }
    } catch (e) {
        console.log(`⚠️ STRIKE FAILED: ${e.message}`);
        // अगर फेल हो जाए तो लिंक को कतार के अंत में भेज दें
        state.queue.push(state.queue.shift());
        await fetch(CONFIG.FB_STATE, { method: 'PUT', body: JSON.stringify(state) });
    }

    await browser.close();
}

strike();
