const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function checkRazorpay(mobile) {
    console.log(`Checking Razorpay for mobile: ${mobile}`);
    try {
        // Unfortunately Razorpay doesn't allow searching by mobile easily in orders
        // but we can list recent orders and check receipts
        const orders = await razorpay.orders.all({
            count: 100
        });

        const userOrders = orders.items.filter(o => o.receipt && o.receipt.includes(mobile));
        console.log(`Found ${userOrders.length} orders for ${mobile}:`);
        console.log(JSON.stringify(userOrders, null, 2));

        for (const order of userOrders) {
            const payments = await razorpay.orders.fetchPayments(order.id);
            console.log(`Payments for order ${order.id}:`, JSON.stringify(payments, null, 2));
        }

        // Also check recent payments directly
        const payments = await razorpay.payments.all({
            count: 100
        });
        
        const userPayments = payments.items.filter(p => p.notes && p.notes.mobile === mobile || (p.contact && p.contact.includes(mobile)));
        console.log(`Found ${userPayments.length} payments in recent 100 for ${mobile}:`);
        console.log(JSON.stringify(userPayments, null, 2));

    } catch (error) {
        console.error('Error checking Razorpay:', error);
    }
}

const mobile = '9711812177';
checkRazorpay(mobile);
