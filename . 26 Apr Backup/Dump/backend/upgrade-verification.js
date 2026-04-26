const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let sponsorToken = '';
let basicToken = '';

async function runUpgradeTest() {
    console.log("=== STARTING SECURE UPGRADE VERIFICATION ===");

    try {
        // 1. Setup Sponsor
        console.log("\n[SETUP] Preparing Sponsor (User-S)...");
        try { await axios.post(`${BASE_URL}/auth/register`, { mobile: '4444444444', name: 'User-S', pin: '1234', amount: 779 }); } catch(e){}
        const sLogin = await axios.post(`${BASE_URL}/auth/login`, { mobile: '4444444444', pin: '1234' });
        sponsorToken = sLogin.data.data.token;
        const sAuth = { headers: { 'Cookie': `jwt=${sponsorToken}` } };
        
        // Ensure Sponsor is active
        const sOrder = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, sAuth);
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: sOrder.data.data.orderId, status: 'SUCCESS' }, sAuth);
        
        const sLogin2 = await axios.post(`${BASE_URL}/auth/login`, { mobile: '4444444444', pin: '1234' });
        const sponsorRefCode = sLogin2.data.data.user.referral_code;

        // 2. Register Basic User under Sponsor
        console.log("\n[STEP 1] Registering User-B as BASIC...");
        const bMobile = '2222222222';
        try { await axios.post(`${BASE_URL}/auth/register`, { mobile: bMobile, name: 'User-B', pin: '1234', amount: 779, referralCode: sponsorRefCode }); } catch(e){}
        const bLogin = await axios.post(`${BASE_URL}/auth/login`, { mobile: bMobile, pin: '1234' });
        basicToken = bLogin.data.data.token;
        const bAuth = { headers: { 'Cookie': `jwt=${basicToken}` } };

        // 3. Activate User-B Basic Plan
        console.log("[STEP 2] Activating User-B Basic Plan (₹779)...");
        const bOrder1 = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, bAuth);
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: bOrder1.data.data.orderId, status: 'SUCCESS' }, bAuth);
        
        // Check Sponsor Balance (Should have ₹120)
        let summary1 = await axios.get(`${BASE_URL}/finance/payout-summary`, sAuth);
        console.log(`Sponsor Balance after Basic Join: ₹${summary1.data.data.availableBalance} (Expected: 120)`);

        // 4. User-B Upgrades to Business
        console.log("\n[STEP 3] User-B Creating Upgrade Order (₹2121)...");
        const upgradeOrder = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BUSINESS', amount: 2121 }, bAuth);
        console.log(`Order Type: ${upgradeOrder.data.data.orderType}, Order ID: ${upgradeOrder.data.data.orderId}`);

        console.log("[STEP 4] Verifying Upgrade Payment...");
        const upgradeVerify = await axios.post(`${BASE_URL}/payment/verify`, { orderId: upgradeOrder.data.data.orderId, status: 'SUCCESS' }, bAuth);
        console.log(`New Role for User-B: ${upgradeVerify.data.data.details.role}`);

        // 5. Final Bonus Check for Sponsor
        let summary2 = await axios.get(`${BASE_URL}/finance/payout-summary`, sAuth);
        console.log(`Sponsor Balance after Business Upgrade: ₹${summary2.data.data.availableBalance} (Expected: 120 + 450 = 570)`);

        if (summary2.data.data.availableBalance === 570) {
            console.log("\n✅ SECURE UPGRADE FLOW VERIFIED SUCCESSFULLY!");
        } else {
            console.log("\n❌ Bonus Mismatch detected.");
        }

        process.exit(0);

    } catch (error) {
        console.error("\nUpgrade Verification Failed:");
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        process.exit(1);
    }
}

runUpgradeTest();
