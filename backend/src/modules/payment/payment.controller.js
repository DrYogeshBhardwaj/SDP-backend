const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { registerUser } = require('../auth/registration.service');
const { generateToken } = require('../../utils/jwt');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * V1 Payment Controller (Clean Slate)
 */
const createOrder = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return errorResponse(res, 400, 'Mobile required');

        const order = await razorpay.orders.create({
            amount: 25000, // 250 INR in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}_${mobile}`
        });

        await prisma.paymentOrder.create({
            data: {
                mobile,
                amount: 250,
                orderId: order.id // This is the official order_... ID
            }
        });

        return successResponse(res, 201, 'Order Created', {
            order_id: order.id,
            amount: 25000,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to create order');
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { order_id, mobile, sponsorCode, name, upiId } = req.body;
        
        // Mark Order PAID
        await prisma.paymentOrder.updateMany({
            where: { orderId: order_id },
            data: { status: 'PAID' }
        });

        // Atomic Register + Commission
        const user = await registerUser({ mobile, sponsorCode, name, upiId });
        const token = generateToken({ userId: user.id });

        // LOG REVENUE TRANSACTION
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 250,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: `Payment Received from ${mobile}`
            }
        });

        return successResponse(res, 200, 'Payment Verified', {
            token,
            user: { id: user.id, mobile: user.mobile }
        });
    } catch (err) {
        console.error('[V1_PAYMENT_ERROR]', err);
        if (err.message === 'ALREADY_EXISTS') return errorResponse(res, 400, 'Already registered');
        return errorResponse(res, 500, `Verification failed: ${err.message}`);
    }
};

const verifyPasswordPayment = async (req, res) => {
    const { mobile, sponsorCode, password, name, upiId } = req.body;
    console.log(`[PASSWORD_PAYMENT_ATTEMPT] Mobile: ${mobile}, Name: ${name}, Sponsor: ${sponsorCode}`);
    try {
        
        // 1. Password Verification
        if (password !== process.env.ACTIVATION_PASSWORD) {
            console.warn(`[PASSWORD_PAYMENT_FAIL] Invalid password attempt for ${mobile}`);
            return errorResponse(res, 401, 'Invalid Activation Password');
        }

        // 2. Atomic Register + Commission
        console.log(`[PASSWORD_PAYMENT_REGISTERING] Starting registration for ${mobile}...`);
        const user = await registerUser({ mobile, sponsorCode, name, upiId });
        console.log(`[PASSWORD_PAYMENT_SUCCESS] User created with ID: ${user.id}`);
        
        const token = generateToken({ userId: user.id });

        // 3. LOG REVENUE TRANSACTION (Manual Audit Entry)
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 250,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: `Manual Activation via Password for ${mobile}`
            }
        });
        console.log(`[PASSWORD_PAYMENT_LOGGED] Revenue transaction recorded for ${mobile}`);

        return successResponse(res, 200, 'Manual Activation Successful', {
            token,
            user: { id: user.id, mobile: user.mobile }
        });
    } catch (err) {
        console.error('[PASSWORD_ACTIVATE_ERROR]', err);
        if (err.message === 'ALREADY_EXISTS') return errorResponse(res, 400, 'Already registered');
        return errorResponse(res, 500, `Manual Activation failed: ${err.message}`);
    }
};

module.exports = { createOrder, verifyPayment, verifyPasswordPayment };
