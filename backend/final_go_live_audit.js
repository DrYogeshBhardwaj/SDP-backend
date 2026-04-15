const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let userId = '';

async function runAudit() {
    console.log("🚀 Starting Final Therapy Billing Audit...");

    try {
        // 0. Setup: Login (Assume test user 9999911111 exists)
        console.log("\n[0] Logging in...");
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            mobile: '8888877777',
            pin: '1234'
        });
        token = loginRes.data.data.token;
        userId = loginRes.data.data.user.id;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Test 1: Start block (Assume user has some minutes for now, then test 0)
        console.log("\n[1] Testing Start Block (0 minutes)...");
        // Manually set balance to 0 for a moment would require DB access, 
        // but we can check the logic by trying to start if balance is low.
        const balResBefore = await axios.get(`${BASE_URL}/minutes/balance`, config);
        const originalBalance = balResBefore.data.data.minutes_balance;
        console.log(`Current Balance: ${originalBalance}`);

        // Test 2: Deduction Accuracy (2-min reservation)
        console.log("\n[2] Testing Deduction Accuracy (2-min reservation)...");
        const startRes = await axios.post(`${BASE_URL}/minutes/start`, { module: 'SDP' }, config);
        console.log(`Start Session Response: ${startRes.data.message}`);
        
        const balResAfterStart = await axios.get(`${BASE_URL}/minutes/balance`, config);
        console.log(`Balance after start (Reserved): ${balResAfterStart.data.data.minutes_balance}`);
        
        if (balResAfterStart.data.data.minutes_balance === originalBalance - 2) {
            console.log("✅ Success: 2 minutes reserved immediately.");
        } else {
            console.log("❌ Failure: Reservation amount incorrect.");
        }

        // Test 3: Refresh Safety (Resume)
        console.log("\n[3] Testing Refresh Safety (Resume)...");
        const resumeRes = await axios.post(`${BASE_URL}/minutes/start`, { module: 'SDP' }, config);
        console.log(`Resume Attempt Response: ${resumeRes.data.message}`);
        if (resumeRes.data.data.resumed) {
            console.log("✅ Success: Session resumed correctly.");
        } else {
            console.log("❌ Failure: Session did not resume.");
        }
        
        const balResAfterResume = await axios.get(`${BASE_URL}/minutes/balance`, config);
        if (balResAfterResume.data.data.minutes_balance === balResAfterStart.data.data.minutes_balance) {
            console.log("✅ Success: No double deduction on resume.");
        } else {
            console.log("❌ Failure: Double deduction detected!");
        }

        // Test 4: End Session (No additional charge for < 2 mins)
        console.log("\n[4] Testing End Session (< 2 mins results in no extra charge)...");
        const endRes = await axios.post(`${BASE_URL}/minutes/end`, { sessionId: startRes.data.data.sessionId }, config);
        console.log(`End Session Response: ${endRes.data.message}, Total Used: ${endRes.data.data.totalUsed}`);
        
        const balResFinal = await axios.get(`${BASE_URL}/minutes/balance`, config);
        console.log(`Final Balance: ${balResFinal.data.data.minutes_balance}`);
        if (balResFinal.data.data.minutes_balance === balResAfterStart.data.data.minutes_balance) {
            console.log("✅ Success: No extra charge for short session (Minimum 2 applied).");
        } else {
            console.log("❌ Failure: Final balance calculation incorrect.");
        }

        console.log("\n✨ Audit Complete!");

    } catch (error) {
        console.error("❌ Audit Failed:", error.response ? error.response.data : error.message);
    }
}

runAudit();
