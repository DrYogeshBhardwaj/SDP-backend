const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let u1Token = '';

async function runTests() {
    console.log("=== STARTING PHASE 2 VERIFICATION ===");

    try {
        // 1. Login Admin
        console.log("\n[SETUP] Logging in Admin...");
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
            mobile: '9999999999',
            pin: '1234'
        });
        adminToken = adminLogin.data.data.token;
        const adminAuth = { headers: { 'Cookie': `jwt=${adminToken}` } };

        // 2. Register New Test User (Pending Payment Flow)
        console.log("\n[PRIORITY 1] Testing New Registration (PENDING status)...");
        const u4Mobile = '5555555555';
        const u4Register = await axios.post(`${BASE_URL}/auth/register`, {
            mobile: u4Mobile,
            name: 'User-4 (Payment Test)',
            pin: '1234',
            amount: 779
        });
        console.log("User-4 registered successfully (Status: PENDING)");

        // 3. Login User-4
        const u4Login = await axios.post(`${BASE_URL}/auth/login`, {
            mobile: u4Mobile,
            pin: '1234'
        });
        u4Token = u4Login.data.data.token;
        const u4Auth = { headers: { 'Cookie': `jwt=${u4Token}` } };

        // 4. Create Payment Order
        console.log("\n[PRIORITY 1] Creating Payment Order for User-4...");
        const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, {
            planId: 'BASIC',
            amount: 779
        }, u4Auth);
        const orderId = orderRes.data.data.orderId;
        console.log(`Order Created: ${orderId}`);

        // 5. Verify Payment (Mock Success)
        console.log("\n[PRIORITY 1] Verifying Payment (Success Simulation)...");
        const verifyRes = await axios.post(`${BASE_URL}/payment/verify`, {
            orderId: orderId,
            status: 'SUCCESS'
        }, u4Auth);
        console.log("Payment Verified. Plan Activated SUCCESS.");
        console.log(`New Role: ${verifyRes.data.data.activation.role}`);

        // 6. Test Tree View (for Admin/U1)
        console.log("\n[PRIORITY 2] Testing Tree View (GET /api/referral/tree)...");
        // Let's use User-1 who already has downline from previous tests
        const u1Login = await axios.post(`${BASE_URL}/auth/login`, { mobile: '8888888888', pin: '1234' });
        const u1Auth = { headers: { 'Cookie': `jwt=${u1Login.data.data.token}` } };
        
        const treeRes = await axios.get(`${BASE_URL}/referral/tree`, u1Auth);
        const tree = treeRes.data.data;
        console.log("Tree Levels Retrieved:");
        console.log(`Level 1 Count: ${tree.level1.length}`);
        console.log(`Level 2 Count: ${tree.level2.length}`);
        console.log(`Level 3 Count: ${tree.level3.length}`);
        if (tree.level1.length > 0) {
            console.log(`Sample Masked Mobile: ${tree.level1[0].mobile}`);
        }

        // 7. Test Payout Summary
        console.log("\n[PRIORITY 3] Testing Payout Summary (GET /api/finance/payout-summary)...");
        const summaryRes = await axios.get(`${BASE_URL}/finance/payout-summary`, u1Auth);
        const summary = summaryRes.data.data;
        console.log(`Available Balance: ₹${summary.availableBalance}`);
        console.log(`Pending Amount: ₹${summary.pendingAmount}`);
        console.log(`History Entries: ${summary.payoutHistory.length}`);

        console.log("\n=== PHASE 2 VERIFICATION COMPLETE ===");
        process.exit(0);

    } catch (error) {
        console.error("\nVerification Failed:");
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        process.exit(1);
    }
}

runTests();
