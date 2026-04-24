const axios = require('axios');

async function testBackend() {
    try {
        console.log("Testing POST /api/payment/create-order...");
        const res = await axios.post('http://localhost:5000/api/payment/create-order', {
            planId: 'BUSINESS',
            amount: 779,
            mobile: '1234567890'
        });
        
        console.log("Response Status:", res.status);
        console.log("Response Body:", JSON.stringify(res.data, null, 2));
        
        const { success, order_id, amount } = res.data;
        if (success === true && order_id && amount) {
            console.log("✅ Backend response validation successful!");
        } else {
            console.error("❌ Backend response validation failed!");
            console.error("Missing fields:", { success, order_id, amount });
        }
    } catch (err) {
        console.error("❌ Request failed:", err.message);
        if (err.response) {
            console.error("Error response:", err.response.data);
        }
    }
}

testBackend();
