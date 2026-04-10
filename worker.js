const puppeteer = require('puppeteer');

async function runTask() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    try {
        // 1. Fetch Queue from Firebase
        const res = await fetch(`${process.env.FB_STATE}.json`);
        const state = await res.json();
        
        if (!state.queue || state.queue.length === 0) {
            console.log("Queue Empty. Terminating.");
            await browser.close();
            return;
        }

        const target = state.queue[0];
        console.log(`Processing: ${target}`);

        // 2. Navigation to Converter (Dyssy)
        await page.goto('https://dyssy.com', { waitUntil: 'networkidle2' });
        
        const inputSelector = 'input[placeholder*="URL"], input[type="text"]';
        await page.waitForSelector(inputSelector);
        await page.type(inputSelector, target);
        await page.keyboard.press('Enter');

        // 3. Wait for Extraction
        await new Promise(r => setTimeout(r, 15000)); // 15 sec wait for processing

        // 4. Capture Data
        const data = await page.evaluate(() => {
            const vid = document.querySelector('video')?.src;
            const thumb = document.querySelector('video')?.poster;
            const title = document.querySelector('h1, h2')?.innerText || "BOMB_Asset";
            return vid ? { clean: vid, thumb, prompt: title } : null;
        });

        if (data) {
            // 5. Push to Firebase Assets & Update Queue
            data.url = target;
            data.time = Date.now();
            
            await fetch(`${process.env.FB_BASE}.json`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            state.queue.shift();
            if (!state.history) state.history = [];
            state.history.push(target);

            await fetch(`${process.env.FB_STATE}.json`, {
                method: 'PUT',
                body: JSON.stringify(state)
            });
            console.log("Success: Vaulted.");
        }

    } catch (e) {
        console.error("Task Failed:", e);
    } finally {
        await browser.close();
    }
}

runTask();
