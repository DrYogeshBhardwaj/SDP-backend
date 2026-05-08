const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { registerUser } = require('../auth/registration.service');
const { generateToken } = require('../../utils/jwt');
const { generateReferralCode } = require('../../utils/referral');
const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Helper to distribute MLM commissions (The Soul of the System)
 */
const distributeCommissions = async (userId, amount, mobile) => {
    try {
        console.log(`[COMMISSION_START] Distributing for user ${userId} (${mobile})`);
        
        // 1. Get the user and their uplines
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { sponsor: { include: { sponsor: true } } }
        });

        if (!user || !user.sponsorId) {
            console.log(`[COMMISSION_SKIP] No sponsor for ${mobile}`);
            return;
        }

        const l1Sponsor = user.sponsor;
        const l2Sponsor = l1Sponsor.sponsor;

        // 2. Level 1 Commission (₹100)
        if (l1Sponsor && l1Sponsor.plan === 'PREMIUM') {
            await prisma.$transaction([
                prisma.wallet.updateMany({
                    where: { userId: l1Sponsor.id, type: 'CASH' },
                    data: { balance: { increment: 100 } }
                }),
                prisma.transaction.create({
                    data: {
                        userId: l1Sponsor.id,
                        fromUserId: userId,
                        amount: 100,
                        type: 'CREDIT',
                        category: 'BONUS',
                        description: `Referral Income (L1) from ${mobile}`
                    }
                })
            ]);
            console.log(`[COMMISSION_L1_SUCCESS] ₹100 to ${l1Sponsor.mobile}`);
        }

        // 3. Level 2 Commission (₹80)
        if (l2Sponsor && l2Sponsor.plan === 'PREMIUM') {
            await prisma.$transaction([
                prisma.wallet.updateMany({
                    where: { userId: l2Sponsor.id, type: 'CASH' },
                    data: { balance: { increment: 80 } }
                }),
                prisma.transaction.create({
                    data: {
                        userId: l2Sponsor.id,
                        fromUserId: userId,
                        amount: 80,
                        type: 'CREDIT',
                        category: 'BONUS',
                        description: `Team Income (L2) from ${mobile}`
                    }
                })
            ]);
            console.log(`[COMMISSION_L2_SUCCESS] ₹80 to ${l2Sponsor.mobile}`);
        }

    } catch (err) {
        console.error('[COMMISSION_ERROR]', err);
    }
};


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * V1 Payment Controller (Clean Slate)
 */
const createOrder = async (req, res) => {
    try {
        let mobile = req.body.mobile;
        let name = req.body.name;
        let upiId = req.body.upiId;
        let amount = 299; // FIXED PRICE V1
        
        if (req.user) {
            const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
            if (user) {
                mobile = user.mobile;
                name = name || user.name;
                upiId = upiId || user.upiId;
            }
        }

        if (!mobile) return errorResponse(res, 400, 'Mobile required');

        const order = await razorpay.orders.create({
            amount: amount * 100, // paise
            currency: "INR",
            receipt: `receipt_${Date.now()}_${mobile}`
        });

        await prisma.paymentOrder.create({
            data: {
                mobile,
                amount: amount,
                orderId: order.id,
                name,
                upiId
            }
        });

        return successResponse(res, 201, 'Order Created', {
            orderId: order.id,
            amount: amount * 100,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('[ORDER_CREATE_ERROR]', err);
        return errorResponse(res, 500, 'Failed to create order');
    }
};

// Simulation removed for security


/**
 * Shared Idempotent Payment Processor
 * Can be called by Frontend Verify OR Webhook
 */
const processSuccessfulPayment = async ({ orderId, mobile, name, upiId, sponsorCode }) => {
    console.log(`[PAYMENT_PROCESSING] Order: ${orderId}, Mobile: ${mobile}`);
    
    // 1. Check if already processed
    const existingOrder = await prisma.paymentOrder.findUnique({
        where: { orderId }
    });
    
    if (existingOrder && existingOrder.status === 'PAID') {
        console.warn(`[PAYMENT_ALREADY_PROCESSED] Order ${orderId}`);
        return { success: true, alreadyDone: true };
    }

    // 2. Mark Order PAID
    await prisma.paymentOrder.update({
        where: { orderId },
        data: { status: 'PAID' }
    });

    // 3. Atomic Register or Upgrade
    let user = await prisma.user.findUnique({ where: { mobile } });
    
    if (user) {
        console.log(`[PAYMENT_UPGRADING] Upgrading existing user ${user.id}...`);
        user = await prisma.user.update({
            where: { mobile },
            data: {
                name: name || user.name,
                upiId: upiId || user.upiId,
                plan: 'PREMIUM',
                isBusinessUnlocked: true,
                referralCode: user.referralCode || generateReferralCode(),
                minutesBalance: 3600
            }
        });
    } else {
        console.log(`[PAYMENT_REGISTERING] Registering new user ${mobile}...`);
        user = await registerUser({ mobile, sponsorCode, name, upiId });
        user = await prisma.user.update({
            where: { id: user.id },
            data: { 
                plan: 'PREMIUM', 
                isBusinessUnlocked: true,
                minutesBalance: 3600 
            }
        });
    }

    // 4. Force Session ID for Single-Device Check
    const crypto = require('crypto');
    const sid = crypto.randomUUID();
    await prisma.user.update({
        where: { id: user.id },
        data: { activeSessionId: sid }
    });

    // 5. Record Revenue Transaction
    await prisma.transaction.create({
        data: {
            userId: user.id,
            amount: 299,
            type: 'CREDIT',
            category: 'PLAN_UPGRADE',
            description: `Verified Payment Received (Order: ${orderId})`
        }
    });

    // 6. DISTRIBUTE COMMISSIONS
    await distributeCommissions(user.id, 299, mobile);

    return { success: true, user, sid };
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mobile, sponsorCode, name, upiId } = req.body;
        
        // 1. SECURE SIGNATURE VERIFICATION
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error(`[PAYMENT_VERIFY_FAIL] Invalid signature for ${mobile}`);
            return errorResponse(res, 400, 'Invalid payment signature');
        }

        // 2. Process
        const result = await processSuccessfulPayment({
            orderId: razorpay_order_id,
            mobile,
            name,
            upiId,
            sponsorCode
        });

        // 3. Generate Token (Session ID might be from result)
        const user = await prisma.user.findUnique({ where: { mobile } });
        const token = generateToken({ userId: user.id, sid: result.sid || user.activeSessionId }, true);

        return successResponse(res, 200, 'Payment Verified', {
            token,
            user: { id: user.id, mobile: user.mobile }
        });
    } catch (err) {
        console.error('[V1_PAYMENT_ERROR]', err);
        return errorResponse(res, 500, `Verification failed: ${err.message}`);
    }
};

const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !secret) {
            console.warn('[WEBHOOK_SKIP] Missing signature or secret');
            return res.status(400).send('Webhook Secret not configured');
        }

        // Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error('[WEBHOOK_INVALID_SIGNATURE]');
            return res.status(400).send('Invalid signature');
        }

        const event = req.body.event;
        console.log(`[RAZORPAY_WEBHOOK] Received event: ${event}`);

        if (event === 'payment.captured' || event === 'order.paid') {
            const payload = req.body.payload;
            const orderId = payload.order ? payload.order.entity.id : payload.payment.entity.order_id;
            
            // Fetch order from our DB to get mobile/name/upi
            const orderRecord = await prisma.paymentOrder.findUnique({
                where: { orderId }
            });

            if (!orderRecord) {
                console.error(`[WEBHOOK_ERROR] Order ${orderId} not found in DB`);
                return res.status(200).send('Order not found');
            }

            if (orderRecord.status === 'PAID') {
                return res.status(200).send('Already processed');
            }

            await processSuccessfulPayment({
                orderId: orderRecord.orderId,
                mobile: orderRecord.mobile,
                name: orderRecord.name,
                upiId: orderRecord.upiId
            });
            
            console.log(`[WEBHOOK_SUCCESS] Processed order ${orderId}`);
        }

        return res.status(200).send('OK');
    } catch (err) {
        console.error('[WEBHOOK_CATASTROPHIC_FAIL]', err);
        return res.status(500).send('Internal Server Error');
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

        // 2. Atomic Register or UPGRADE
        console.log(`[PASSWORD_PAYMENT_PROCESSING] Processing ${mobile}...`);
        
        let user = await prisma.user.findUnique({ where: { mobile } });
        
        if (user) {
            console.log(`[PASSWORD_PAYMENT_UPGRADING] Upgrading existing user ${user.id}...`);
            user = await prisma.user.update({
                where: { mobile },
                data: {
                    name: name || user.name,
                    upiId: upiId || user.upiId,
                    plan: 'PREMIUM',
                    isBusinessUnlocked: true,
                    referralCode: user.referralCode || generateReferralCode(),
                    minutesBalance: 3600
                }
            });
        } else {
            console.log(`[PASSWORD_PAYMENT_REGISTERING] Registering new user ${mobile}...`);
            user = await registerUser({ mobile, sponsorCode, name, upiId });
            // By default registerUser sets PREMIUM if it was the old flow, 
            // but we ensure it's unlocked here.
            user = await prisma.user.update({
                where: { id: user.id },
                data: { 
                    plan: 'PREMIUM', 
                    isBusinessUnlocked: true,
                    minutesBalance: 3600
                }
            });
        }
        
        const crypto = require('crypto');
        const sid = crypto.randomUUID();
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sid }
        });

        const token = generateToken({ userId: user.id, sid }, true);

        // 3. LOG REVENUE TRANSACTION (Manual Audit Entry)
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 299,
                type: 'CREDIT',
                category: 'PLAN_UPGRADE',
                description: `Manual Activation via Password (₹299)`
            }
        });

        // 4. DISTRIBUTE COMMISSIONS (Soul of the System)
        await distributeCommissions(user.id, 299, mobile);

        return successResponse(res, 200, 'Activation Successful', {
            token,
            user: { id: user.id, mobile: user.mobile }
        });
    } catch (err) {
        console.error('[PASSWORD_ACTIVATE_ERROR]', err);
        return errorResponse(res, 500, `Manual Activation failed: ${err.message}`);
    }
};

module.exports = { createOrder, verifyPayment, verifyPasswordPayment, distributeCommissions, handleWebhook };
