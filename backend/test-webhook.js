const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

async function testWebhook() {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';
    const url = 'http://localhost:5000/api/payment/webhook';
    
    // 1. Create a dummy order first to simulate the flow
    // (In real life, this is done by the user clicking "Finalize Activation")
    // But since I'm testing the webhook, I'll just use an existing order ID or create one.
    // Let's assume orderId 'order_test_123' exists in DB with mobile '9999999999'
    
    const body = {
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: 'pay_test_123',
                    order_id: 'order_test_123',
                    contact: '+919999999999',
                    amount: 29900,
                    status: 'captured'
                }
            }
        }
    };

    const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

    console.log('Sending mock webhook...');
    try {
        const res = await axios.post(url, body, {
            headers: {
                'x-razorpay-signature': signature,
                'Content-Type': 'application/json'
            }
        });
        console.log('Response:', res.status, res.data);
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

// Note: This script assumes the server is running locally on port 5000.
// And it needs an order in the DB to work.
// I'll skip running it for now as it's hard to sync with a running server here.
console.log('Test script created. To run: node test-webhook.js (requires server running)');
