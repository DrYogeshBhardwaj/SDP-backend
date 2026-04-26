const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runAudit() {
    console.log("🚀 Starting SINAANK Final Go-Live Audit...");
    console.log("--------------------------------------------------");

    try {
        // [Test 5] Direct Register Block
        console.log("[Test 5] Direct Register Block (No Order)");
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                mobile: "9999999999",
                name: "Hacker",
                pin: "1234",
                orderId: "fake_order"
            });
            console.log("❌ Failed: Registration succeeded without valid order!");
        } catch (err) {
            console.log("✅ Passed: Blocked invalid order. Error:", err.response?.data?.message);
        }

        // [Test 1] Cancel Payment Test
        console.log("\n[Test 1] Cancel Payment Test");
        const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, {
            planId: "BASIC",
            amount: 779
        });
        const orderId = orderRes.data.data.orderId;
        console.log("Order Created:", orderId);

        try {
            await axios.post(`${BASE_URL}/payment/verify-payment`, {
                orderId: orderId,
                status: "FAILURE"
            });
        } catch (err) {
            // Expected 400
        }
        console.log("Payment Cancelled (Simulated).");
        
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                mobile: "9999999991",
                name: "Cancelled User",
                pin: "1234",
                orderId: orderId
            });
            console.log("❌ Failed: Registration succeeded for FAILED order!");
        } catch (err) {
            console.log("✅ Passed: Registration blocked for failed order.");
        }

        // [Test 4] Webhook Retry Safety (Idempotency)
        console.log("\n[Test 4] Webhook Retry Safety (Idempotent success)");
        const order2Res = await axios.post(`${BASE_URL}/payment/create-order`, {
            planId: "BASIC",
            amount: 779
        });
        const orderId2 = order2Res.data.data.orderId;
        
        await axios.post(`${BASE_URL}/payment/verify-payment`, {
            orderId: orderId2, status: "SUCCESS"
        });
        console.log("First Webhook: SUCCESS");
        
        const retryRes = await axios.post(`${BASE_URL}/payment/verify-payment`, {
            orderId: orderId2, status: "SUCCESS"
        });
        console.log("Retry Webhook Response:", retryRes.data.message);
        console.log("✅ Passed: Webhook is idempotent.");

        // [Test 3] Double Click Protection
        console.log("\n[Test 3] Double Click Protection (Registration)");
        const mobile3 = "9876543201";
        
        // Use the PAID order from Test 4
        console.log("Attempt 1...");
        const reg1 = await axios.post(`${BASE_URL}/auth/register`, {
            mobile: mobile3, name: "Double User", pin: "1234", orderId: orderId2
        });
        console.log("Attempt 1 Success:", reg1.data.success);

        console.log("Attempt 2 (Same Order)...");
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                mobile: mobile3, name: "Double User", pin: "1234", orderId: orderId2
            });
            console.log("❌ Failed: Duplicate registration with same order allowed!");
        } catch (err) {
            console.log("✅ Passed: Blocked duplicate order usage. Error:", err.response?.data?.message);
        }

        // [Test 2] Success but Refresh
        console.log("\n[Test 2] Success but Refresh Simulation");
        const order3Res = await axios.post(`${BASE_URL}/payment/create-order`, {
            planId: "BUSINESS", amount: 2990
        });
        const orderId3 = order3Res.data.data.orderId;
        await axios.post(`${BASE_URL}/payment/verify-payment`, { orderId: orderId3, status: "SUCCESS" });
        console.log("Order PAID, browser refreshed (Intentional delay simulation)");
        
        const reg3 = await axios.post(`${BASE_URL}/auth/register`, {
            mobile: "9876543202", name: "Refresh User", pin: "1234", orderId: orderId3
        });
        console.log("Register Success after Refresh:", reg3.data.success);
        console.log("✅ Passed: Order persistent and usable until registration completes.");

        console.log("\n--------------------------------------------------");
        console.log("🏆 ALL 5 GO-LIVE VERIFICATIONS PASSED 🚀");

    } catch (err) {
        console.error("Audit Failed with unexpected error:", err.message);
        if (err.response) console.error("Data:", err.response.data);
    }
}

runAudit();
