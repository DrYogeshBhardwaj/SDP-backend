const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { registerUser } = require('../auth/registration.service');
const { generateToken } = require('../../utils/jwt');

/**
 * Payment Controller (V1 Clean Slate)
 * Handles ₹250 plan orders and verification leads to account creation.
 */

const createOrder = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return errorResponse(res, 400, 'Mobile required');

        // V1 Plan Fixed Amount: ₹250
        const orderId = `V1_ORD_${Date.now()}_${mobile}`;
        
        // Tracking order in DB
        await prisma.paymentOrder.create({
            data: {
                mobile,
                plan_type: 'V1-250',
                amount: 250,
                order_id: orderId,
                status: 'CREATED'
            }
        });

        return successResponse(res, 201, 'Order Created', {
            order_id: orderId,
            amount: 25000, // In paise
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_SCIAVlpP2ZTERN'
        });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to create order');
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { order_id, mobile, sponsorCode } = req.body;
        
        // MOCK Verification for V1 Testing
        console.log(`[V1_PAYMENT] Verifying payment for mobile: ${mobile}`);
        
        // 1. Mark Order as PAID
        await prisma.paymentOrder.updateMany({
            where: { order_id },
            data: { status: 'PAID' }
        });

        // 2. Perform Atomic Registration
        const user = await registerUser({ mobile, sponsorCode });

        // 3. Generate Token
        const token = generateToken({ userId: user.id });

        return successResponse(res, 200, 'Payment Verified & Registration Success', {
            token,
            user: { id: user.id, mobile: user.mobile }
        });
    } catch (err) {
        if (err.message === 'ALREADY_EXISTS') return errorResponse(res, 400, 'User already registered');
        return errorResponse(res, 500, 'Verification/Registration failed');
    }
};

module.exports = {
    createOrder,
    verifyPayment
};
