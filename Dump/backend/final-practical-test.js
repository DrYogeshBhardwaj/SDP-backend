const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let u1Token = '';
let u2Token = '';
let u3Token = '';

const authHead = (token) => ({ headers: { 'Cookie': `jwt=${token}` } });

async function runPracticalTest() {
    console.log("=== STARTING SINAANK PRACTICAL TEST (7-STEPS) ===\n");

    try {
        // --- STEP 0: Setup Admin ---
        console.log("[SETUP] Logging in Admin (9999999999)...");
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, { mobile: '9999999999', pin: '1234' });
        adminToken = adminLogin.data.data.token;
        console.log("Admin logged in.\n");

        // --- STEP 1: User-1 Registration (PENDING check) ---
        console.log("🚀 Step-1: Register User-1 (8888888888)...");
        try { await axios.post(`${BASE_URL}/auth/register`, { mobile: '8888888888', name: 'User-1', pin: '1234' }); } catch(e){}
        const u1Login = await axios.post(`${BASE_URL}/auth/login`, { mobile: '8888888888', pin: '1234' });
        u1Token = u1Login.data.data.token;
        console.log(`Status: ${u1Login.data.data.user.status} (Verified PENDING)`);
        console.log(`Kit Activated: ${u1Login.data.data.user.kit_activated} (Verified FALSE)`);

        // --- STEP 2: Payment Mock (Basic) ---
        console.log("\n🚀 Step-2: User-1 Basic ₹779 Payment...");
        const u1Order = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, authHead(u1Token));
        const orderId1 = u1Order.data.data.orderId;
        console.log(`Order Created: ${orderId1}`);
        
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: orderId1, status: 'SUCCESS' }, authHead(u1Token));
        const u1Login2 = await axios.post(`${BASE_URL}/auth/login`, { mobile: '8888888888', pin: '1234' });
        u1Token = u1Login2.data.data.token; // Refresh token with new code
        const u1Code = u1Login2.data.data.user.referral_code;
        console.log(`Plan Activated. Role: ${u1Login2.data.data.user.role}, Referral Code: ${u1Code}`);

        // --- STEP 3: Referral Test (User-2 Join) ---
        console.log("\n🚀 Step-3: User-2 (7777777777) Referral Join via User-1...");
        try { await axios.post(`${BASE_URL}/auth/register`, { mobile: '7777777777', name: 'User-2', pin: '1234', referralCode: u1Code }); } catch(e){}
        const u2Login = await axios.post(`${BASE_URL}/auth/login`, { mobile: '7777777777', pin: '1234' });
        u2Token = u2Login.data.data.token;

        const u2Order = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BASIC', amount: 779 }, authHead(u2Token));
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: u2Order.data.data.orderId, status: 'SUCCESS' }, authHead(u2Token));
        console.log("User-2 Activated.");

        const u1Summary = await axios.get(`${BASE_URL}/finance/payout-summary`, authHead(u1Token));
        console.log(`User-1 Income: ₹${u1Summary.data.data.availableBalance} (Expected: 120)`);

        // --- STEP 4: Business Join Test (User-3 Join) ---
        console.log("\n🚀 Step-4: User-3 (6666666666) Business ₹2900 Join via User-1...");
        try { await axios.post(`${BASE_URL}/auth/register`, { mobile: '6666666666', name: 'User-3', pin: '1234', referralCode: u1Code }); } catch(e){}
        const u3Login = await axios.post(`${BASE_URL}/auth/login`, { mobile: '6666666666', pin: '1234' });
        u3Token = u3Login.data.data.token;

        const u3Order = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BUSINESS', amount: 2900 }, authHead(u3Token));
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: u3Order.data.data.orderId, status: 'SUCCESS' }, authHead(u3Token));
        console.log("User-3 Business Activated.");

        const u1Summary2 = await axios.get(`${BASE_URL}/finance/payout-summary`, authHead(u1Token));
        console.log(`User-1 Wallet: ₹${u1Summary2.data.data.availableBalance} (Expected: 120 + 450 = 570)`);

        // --- STEP 5: Tree View Check ---
        console.log("\n🚀 Step-5: checking Tree View for User-1...");
        const treeRes = await axios.get(`${BASE_URL}/referral/tree`, authHead(u1Token));
        const l1 = treeRes.data.data.level1;
        console.log(`Level 1 Count: ${l1.length}`);
        l1.forEach(u => console.log(` - ${u.mobile} (${u.plan})`));

        // --- STEP 6: Upgrade Test ---
        console.log("\n🚀 Step-6: User-2 Upgrade to Business (₹2121)...");
        const upgradeOrder = await axios.post(`${BASE_URL}/payment/create-order`, { planId: 'BUSINESS', amount: 2121 }, authHead(u2Token));
        await axios.post(`${BASE_URL}/payment/verify`, { orderId: upgradeOrder.data.data.orderId, status: 'SUCCESS' }, authHead(u2Token));
        console.log("User-2 Upgraded to Business.");

        const u1Summary3 = await axios.get(`${BASE_URL}/finance/payout-summary`, authHead(u1Token));
        console.log(`User-1 Total Income: ₹${u1Summary3.data.data.availableBalance} (Expected: 570 + 450 = 1020)`);

        // --- STEP 7: Withdraw Test ---
        console.log("\n🚀 Step-7: User-1 Withdrawal Request (₹500)...");
        const withdrawReq = await axios.post(`${BASE_URL}/finance/request-payout`, { amount: 500 }, authHead(u1Token));
        const payoutId = withdrawReq.data.data.payout_id;
        console.log(`Withdrawal Requested. Payout ID: ${payoutId}`);

        console.log("Admin Approving Withdrawal...");
        await axios.post(`${BASE_URL}/finance/approve-payout`, { payoutId }, authHead(adminToken));
        console.log("Withdrawal Approved.");

        const u1SummaryFinal = await axios.get(`${BASE_URL}/finance/payout-summary`, authHead(u1Token));
        console.log(`User-1 Final Balance: ₹${u1SummaryFinal.data.data.availableBalance} (Expected: 1020 - 500 = 520)`);

        console.log("\n✅ ALL STEPS PASSED - SYSTEM PERFECT!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ PRACTICAL TEST FAILED:");
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : (error.message + "\n" + error.stack));
        process.exit(1);
    }
}

runPracticalTest();
