const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\8f1d2017-8f5e-4891-901d-fa8b338cc361';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Set to iPhone 12 viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log("Capturing Home Page...");
    await page.goto('http://localhost:5000/public/index.html');
    await delay(1000);
    await page.screenshot({ path: path.join(ASSETS_DIR, 'mobile_home.png'), fullPage: true });

    console.log("Capturing Login Page...");
    await page.goto('http://localhost:5000/public/login.html');
    await delay(1000);
    await page.screenshot({ path: path.join(ASSETS_DIR, 'mobile_login.png'), fullPage: true });

    // Login as ordinary user
    console.log("Logging in as User...");
    await page.evaluate(async () => {
        await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '9999999999', pin: '1234' })
        });
    });

    console.log("Capturing User Dashboard...");
    await page.goto('http://localhost:5000/dashboard/user.html');
    await delay(2000); // Wait for API calls
    await page.screenshot({ path: path.join(ASSETS_DIR, 'mobile_user_dashboard.png'), fullPage: true });

    // Logout
    await page.goto('http://localhost:5000/public/index.html');
    await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST' }); });

    // Login as Seeder
    console.log("Logging in as Seeder...");
    await page.goto('http://localhost:5000/public/login.html');
    await page.evaluate(async () => {
        await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '8888888888', pin: '1234' })
        });
    });

    console.log("Capturing Seeder Dashboard...");
    await page.goto('http://localhost:5000/dashboard/seeder.html');
    await delay(2000); // Wait for API calls
    await page.screenshot({ path: path.join(ASSETS_DIR, 'mobile_seeder_dashboard.png'), fullPage: true });

    // Note: Admin panel screenshot wasn't requested in the final list, but we confirmed it has scrollable tables.

    console.log("Done!");
    await browser.close();
})();
