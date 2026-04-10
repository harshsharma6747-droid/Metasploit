const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const CONFIG = {
    FB_STATE: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/global_state.json",
    FB_ASSETS: "https://bomb-aa638-default-rtdb.firebaseio.com/sora_vault/assets.json",
    BATCH_SIZE: 5 
};

async function strike() {
    console.log("🔱 G-GHOST CHRONOS: INITIATING CLOUD STRIKE...");
    
    // 1. Firebase से ताजा कतार प्राप्त करें
    const res = await fetch(CONFIG.FB_STATE);
    let state = await res.json();
    
    if (!state || !state.queue || state.queue.length === 0) {
        console.log("❌ QUEUE EMPTY. STANDING BY.");
        return;
    }

    // 2. Headless Browser सेटअप
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    // 3. बैच में लिंक्स प्रोसेस करना
    for (let i = 0; i < Math.min(CONFIG.BATCH_SIZE, state.queue.length); i++) {
        const target = state.queue[0];
        console.log(`🎯 TARGET ${i+1}/${CONFIG.BATCH_SIZE}: ${target}`);
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        try {
            // dyysy.com पर हमला
            await page.goto(`https://dyysy.com/?url=${encodeURIComponent(target)}`, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // वीडियो एलिमेंट का इंतज़ार
            await page.waitForSelector('video', { timeout: 35000 });
            
            const data = await page.evaluate(() => {
                const vEl = document.querySelector('video');
                const titleEl = document.querySelector('#videoTitle, h1, .video-title');
                return {
                    clean: vEl?.src || vEl?.querySelector('source')?.src,
                    thumb: vEl?.poster || document.querySelector('img[src*="thumb"]')?.src,
                    prompt: titleEl?.innerText || "Untitled_Asset"
                };
            });

            if (data.clean && data.clean.startsWith('http')) {
                // सफल लूट को Assets फोल्डर में भेजें
                await fetch(CONFIG.FB_ASSETS, {
                    method: 'POST',
                    body: JSON.stringify({ ...data, url: target, time: Date.now(), node: "GITHUB-STRIKER" })
                });

                // कतार से हटाएं और हिस्ट्री में डालें
                state.queue.shift();
                state.history = state.history || [];
                if (!state.history.includes(target)) state.history.push(target);
                console.log("✅ VAULTED SUCCESSFULLY.");
            } else {
                throw new Error("EMPTY_DATA");
            }
        } catch (e) {
            console.log(`⚠️ FAILED: ${e.message}. MOVING TO END OF QUEUE.`);
            // फेल होने पर लिंक को कतार के अंत में भेजें
            state.queue.push(state.queue.shift());
        }
        
        await page.close();
        
        // हर सफल/असफल प्रयास के बाद Firebase State अपडेट करें
        await fetch(CONFIG.FB_STATE, {
            method: 'PUT',
            body: JSON.stringify(state)
        });
    }

    await browser.close();
    console.log("🔱 MISSION COMPLETE. SYSTEM RECHARGING...");
}

strike();
