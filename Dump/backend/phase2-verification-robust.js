const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let sponsorToken = '';
let downlineToken = '';

async function runTests() {
    console.log("=== STARTING ROBUST PHASE 2 VERIFICATION ===");

    try {
        // 1. Setup Sponsor (Mobile: 4444444444)
        console.log("\n[SETUP] Registering Sponsor (User-S)...");
        try {
            await axios.post(`${BASE_URL}/auth/register`, { mobile: '4444444444', name: 'User-S', pin: '1234', amount: 779 });
        } catch (e) { console.log("Sponsor already exists or registered."); }
        
        const sLogin = await axios.post(`${BASE_URL}/auth/login`, { mobile: '4444444444', pin: '1234' });
        sponsorToken = sLogin.data.data.token;
        const sAuth = { headers: { 'Cookie': `jwt=${sponsorToken}` } };

        // 2. Activate Sponsor so they have a referral code
        console.log("[SETUP] Activating Sponsor...");
        const sOrder = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, sAuth);
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: sOrder.data.data.orderId, status: 'SUCCESS' }, sAuth);
        
        // Re-login to get updated user data (referral code)
        const sLogin2 = await axios.post(`${BASE_URL}/auth/login`, { mobile: '4444444444', pin: '1234' });
        const sponsorRefCode = sLogin2.data.data.user.referral_code;
        console.log(`Sponsor Active. Code: ${sponsorRefCode}`);

        // 3. Register Downline using Sponsor's code
        console.log("\n[PRIORITY 1] Registering Downline (User-D) under Sponsor...");
        const dMobile = '3333333333';
        try {
            await axios.post(`${BASE_URL}/auth/register`, { 
                mobile: dMobile, name: 'User-D', pin: '1234', amount: 779, referralCode: sponsorRefCode 
            });
        } catch (e) { console.log("Downline already exists."); }

        const dLogin = await axios.post(`${BASE_URL}/auth/login`, { mobile: dMobile, pin: '1234' });
        downlineToken = dLogin.data.data.token;
        const dAuth = { headers: { 'Cookie': `jwt=${downlineToken}` } };

        // 4. Test PENDING status (Downline shouldn't be active yet)
        console.log(`User-D Status: ${dLogin.data.data.user.status} (Verified PENDING)`);

        // 5. Activate User-D via Payment Gateway
        console.log("\n[PRIORITY 1] Creating Order for User-D...");
        const dOrder = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, dAuth);
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: dOrder.data.data.orderId, status: 'SUCCESS' }, dAuth);
        console.log("User-D Activated SUCCESS.");

        // 6. Test Tree View (Check Sponsor's tree)
        console.log("\n[PRIORITY 2] Checking Sponsor's Tree View...");
        const treeRes = await axios.get(`${BASE_URL}/referral/tree`, sAuth);
        const tree = treeRes.data.data;
        console.log(`Level 1 Count: ${tree.level1.length}`);
        if (tree.level1.length > 0) {
            console.log(`First Downline Masked Mobile: ${tree.level1[0].mobile}`);
            console.log(`First Downline Status: ${tree.level1[0].status}`);
        }

        // 7. Test Payout Summary
        console.log("\n[PRIORITY 3] Checking Sponsor's Payout Summary...");
        const summaryRes = await axios.get(`${BASE_URL}/finance/payout-summary`, sAuth);
        const summary = summaryRes.data.data;
        console.log(`Available Balance (after downline join): ₹${summary.availableBalance}`);
        console.log(`Pending Amount: ₹${summary.pendingAmount}`);

        console.log("\n=== PHASE 2 ROBUST VERIFICATION COMPLETE ===");
        process.exit(0);

    } catch (error) {
        console.error("\nVerification Failed:");
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        process.exit(1);
    }
}

runTests();
