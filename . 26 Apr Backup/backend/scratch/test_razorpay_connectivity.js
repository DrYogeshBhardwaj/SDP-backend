const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function testOrder() {
    console.log("Using Key:", process.env.RAZORPAY_KEY_ID);
    try {
        const order = await razorpay.orders.create({
            amount: 100, // 1 INR
            currency: "INR",
            receipt: "test_receipt"
        });
        console.log("SUCCESS: Order Created:", order.id);
    } catch (err) {
        console.error("FAILURE: Razorpay Order Creation Failed!");
        console.error("Error Message:", err.message);
        console.error("Full Error:", JSON.stringify(err));
    }
}

testOrder();
