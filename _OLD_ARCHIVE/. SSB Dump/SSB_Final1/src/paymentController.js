const Razorpay = require('razorpay');
const crypto = require('crypto');

// Product Data (Strict Backend Source)
const PRODUCTS = {
    'smt': {
        name: 'SMT (1 Kit)',
        amount: 17800, // STRICT: ₹178
        commission: { seller: 56, system: 122 }
    },
    'smt_mix': {
        name: 'SMT Mix (2 Kit)',
        amount: 32000, // STRICT: ₹320 (Offer)
        commission: { seller: 130, system: 190 }
    },
    'smt_family': {
        name: 'SMT Family (5 Kit)',
        amount: 68800, // STRICT: ₹688 (Offer)
        commission: { seller: 390, system: 298 }
    }
};

let razorpayInstance = null;

const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay keys are missing in .env');
            return null;
        }
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpayInstance;
};

exports.createOrder = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = PRODUCTS[productId];

        if (!product) {
            return res.status(400).json({ error: 'Invalid Product ID' });
        }

        const instance = getRazorpayInstance();
        if (!instance) {
            return res.status(500).json({ error: 'Razorpay configuration missing' });
        }

        const options = {
            amount: product.amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                productId: productId,
                productName: product.name
            }
        };

        const order = await instance.orders.create(options);
        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID, // Send only Key ID to frontend
            product_name: product.name
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ error: 'Something went wrong while creating order' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, productId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment Success
            const product = PRODUCTS[productId];

            if (product) {
                // INTERNAL COMMISSION LOGIC
                // In a real app, save to DB here.
                console.log('====================================');
                console.log(`PAYMENT VERIFIED: ${razorpay_payment_id}`);
                console.log(`Product: ${product.name}`);
                console.log(`Amount Paid: ₹${product.amount / 100}`);
                console.log('--- COMMISSION SPLIT (INTERNAL) ---');
                console.log(`Seller Earning: ₹${product.commission.seller}`);
                console.log(`System Share:   ₹${product.commission.system}`);
                console.log('====================================');

                return res.json({
                    status: 'success',
                    message: 'Payment Verified',
                    data: {
                        product: product.name,
                        amount: product.amount / 100
                    }
                });
            } else {
                return res.status(400).json({ status: 'failure', message: 'Product info mismatch' });
            }

        } else {
            return res.status(400).json({ status: 'failure', message: 'Invalid Signature' });
        }

    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};
