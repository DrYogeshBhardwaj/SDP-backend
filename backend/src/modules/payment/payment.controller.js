const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay;
try {
    const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.trim() : null;
    const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : null;

    console.log(`[RAZORPAY_INIT] KeyID: ${keyId ? 'FOUND' : 'MISSING'}, KeySecret: ${keySecret ? 'FOUND' : 'MISSING'}`);

    if (keyId && keySecret) {
        razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });
        console.log("Razorpay initialized successfully");
    } else {
        const missing = [];
        if (!keyId) missing.push("RAZORPAY_KEY_ID");
        if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");
        
        console.warn(`[RAZORPAY] Initialization failed. Missing: ${missing.join(", ")}`);
        
        razorpay = {
            orders: {
                create: () => { throw new Error(`Razorpay not configured. Missing: ${missing.join(", ")}`); }
            }
        };
    }
} catch (error) {
    console.error("Failed to initialize Razorpay:", error.message);
}

/**
 * 1. Create Order (Razorpay)
 * Initiates the payment process by creating an order in Razorpay.
 */
const createOrder = async (req, res) => {
    try {
        const { planId, amount, mobile } = req.body; 

        if (!amount || !['BASIC', 'BUSINESS'].includes(planId)) {
            return errorResponse(res, 400, 'Invalid plan or amount');
        }

        // Razorpay expects amount in paise (multiply by 100)
        const options = {
            amount: Math.round(parseFloat(amount) * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: {
                mobile: mobile || 'N/A',
                plan: planId
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Create a PaymentOrder for tracking in our DB
        await prisma.paymentOrder.create({
            data: {
                mobile: mobile || null,
                plan_type: planId,
                amount: parseFloat(amount),
                order_id: razorpayOrder.id,
                status: 'CREATED'
            }
        });

        return res.status(201).json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        return errorResponse(res, 500, error.message || 'Failed to create Razorpay order');
    }
};

const { registerUser } = require('../auth/registration.service');
const { generateToken } = require('../../utils/jwt');

/**
 * 2. Verify Payment (Signature Verification)
 * Validates the Razorpay payment signature before marking as PAID.
 * Automatically creates a user account if user data is provided.
 */
const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            isDemo, // NEW: Demo mode flag
            // Combined registration data
            name,
            mobile,
            pin,
            sponsor,
            plan_type,
            amount 
        } = req.body;

        let verifiedOrderId = razorpay_order_id;

        if (!isDemo) {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return errorResponse(res, 400, 'Missing payment parameters');
            }

            // Verify Signature
            const secret = process.env.RAZORPAY_KEY_SECRET;
            const generated_signature = crypto
                .createHmac('sha256', secret)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest('hex');

            if (generated_signature !== razorpay_signature) {
                return errorResponse(res, 400, 'Invalid payment signature');
            }

            // Check if order exists
            const order = await prisma.paymentOrder.findUnique({
                where: { order_id: razorpay_order_id }
            });

            if (!order) {
                return errorResponse(res, 404, 'Order not found in database');
            }
            verifiedOrderId = order.order_id;
        } else {
            // DEMO MODE: Bypass verification
            console.log(`[DEMO MODE] Bypassing payment for mobile: ${mobile}`);
            verifiedOrderId = razorpay_order_id || 'DEMO_BYPASS_' + Date.now();
        }

        // Scenario 1: Verify and REGISTER (Post-Payment Signup Flow)
        if (name && mobile && pin) {
            try {
                const user = await registerUser({
                    mobile,
                    name,
                    pin,
                    plan_type: plan_type || (isDemo ? 'BASIC' : null), // Default to BASIC if demo
                    amount: amount || 0,
                    sponsor: sponsor || '',
                    orderId: verifiedOrderId
                });
                
                // Add a flag to mark as demo if needed
                if (isDemo) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { status: 'DEMO' }
                    }).catch(e => console.warn("Failed to update status to DEMO:", e.message));
                }

                // Generate Session Token
                const token = generateToken({
                    userId: user.id,
                    role: user.role,
                    cid: user.cid
                });

                // Set Cookie
                res.cookie('jwt', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });

                return successResponse(res, 201, isDemo ? 'Demo account created' : 'Payment verified and account created', {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        mobile: user.mobile,
                        cid: user.cid,
                        role: user.role,
                        plan_type: user.plan_type,
                        kit_activated: user.kit_activated
                    }
                });
            } catch (err) {
                if (err.message === 'USER_ALREADY_EXISTS') {
                    return errorResponse(res, 400, 'User with this mobile already exists');
                }
                throw err; 
            }
        }

        // Scenario 2: Legacy/Basic Verify (Simple status update) - ONLY if not demo
        if (!isDemo) {
            const order = await prisma.paymentOrder.findUnique({
                where: { order_id: razorpay_order_id }
            });
            
            if (order) {
                await prisma.paymentOrder.update({
                    where: { id: order.id },
                    data: { 
                        status: 'PAID',
                        payment_id: razorpay_payment_id
                    }
                });
            }
            return successResponse(res, 200, 'Payment verified successfully');
        } else {
            return successResponse(res, 200, 'Demo verification complete');
        }
    } catch (error) {
        console.error('Verify Payment Error:', error);
        return errorResponse(res, 500, error.message || 'Failed to verify payment');
    }
};

module.exports = {
    createOrder,
    verifyPayment
};

