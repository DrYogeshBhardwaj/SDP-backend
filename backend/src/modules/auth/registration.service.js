const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin } = require('../../utils/hash');
const sidService = require('../user/sid.service');

/**
 * Atomic Registration Service
 * Handles user creation, wallet setup, and commission distribution.
 * 
 * @param {Object} data - User registration data
 * @param {string} data.mobile - User mobile number
 * @param {string} data.name - User full name
 * @param {string} data.pin - 4-digit numeric PIN
 * @param {string} data.plan_type - BASIC / BUSINESS
 * @param {number} data.amount - Amount paid
 * @param {string} data.sponsor - Referrer code or mobile
 * @param {string} data.orderId - Razorpay order ID
 * @returns {Promise<Object>} - Created user object
 */
async function registerUser(data) {
    const { mobile, name, pin, plan_type, amount, sponsor, orderId } = data;

    // 1. Constants & Plan Mapping
    const COMMISSIONS = {
        BASIC: { L1: 120, L2: 80, L3: 50 },
        BUSINESS: { L1: 450, L2: 250, L3: 150 }
    };

    const comms = COMMISSIONS[plan_type] || COMMISSIONS.BASIC;

    // 2. Identify Sponsors (Chain Snapshot)
    const l1Sponsor = await prisma.user.findFirst({
        where: {
            OR: [
                { referral_code: sponsor },
                { mobile: sponsor }
            ]
        }
    });

    let l2Id = null, l3Id = null;
    if (l1Sponsor) {
        l2Id = l1Sponsor.level1_id;
        l3Id = l1Sponsor.level2_id;
    }

    // 3. Generate Codes & Hash
    const referral_code = await generateReferralCode();
    const pin_hash = await hashPin(pin);
    const cid = mobile; // Unified identity: Mobile is the CID

    // 4. ATOMIC TRANSACTION
    const user = await prisma.$transaction(async (tx) => {
        // A. Check for duplicate
        const existing = await tx.user.findUnique({ where: { mobile } });
        if (existing) throw new Error('USER_ALREADY_EXISTS');

        // B. Mark Order as used (Skip for Demo Mode or manual bypass)
        if (orderId && orderId !== 'OTP_VERIFIED_BYPASS' && !orderId.startsWith('DEMO_BYPASS_')) {
            await tx.paymentOrder.update({
                where: { order_id: orderId },
                data: { used: true, status: 'PAID' }
            });
        }

        // C. Create User
        const newUser = await tx.user.create({
            data: {
                mobile,
                cid,
                name: name || 'Sinaank User',
                pin_hash,
                role: plan_type,
                plan_type,
                plan_amount: parseFloat(amount),
                join_type: 'DIRECT',
                status: 'ACTIVE',
                kit_activated: true,
                activated_at: new Date(),
                referral_code,
                sponsor_id: l1Sponsor ? l1Sponsor.id : null,
                level1_id: l1Sponsor ? l1Sponsor.id : null,
                level2_id: l2Id,
                level3_id: l3Id
            }
        });

        // D. Create Wallets
        await tx.walletCash.create({ data: { userId: newUser.id } });
        await tx.walletMinute.create({ data: { userId: newUser.id, balance: 3650 } });

        // E. Distribute Commissions
        const recipients = [
            { id: l1Sponsor ? l1Sponsor.id : null, amount: comms.L1, level: 1 },
            { id: l2Id, amount: comms.L2, level: 2 },
            { id: l3Id, amount: comms.L3, level: 3 }
        ];

        for (const r of recipients) {
            if (r.id) {
                // Update Cash Wallet
                await tx.walletCash.update({
                    where: { userId: r.id },
                    data: { balance: { increment: r.amount } }
                });

                // Audit: Transaction Ledger
                await tx.transaction.create({
                    data: {
                        userId: r.id,
                        from_user_id: newUser.id,
                        level: r.level,
                        amount: r.amount,
                        credit: r.amount,
                        plan_type,
                        plan_amount: amount,
                        type: 'BONUS',
                        description: `Level ${r.level} Join Bonus from ${name || mobile}`,
                        txStatus: 'COMPLETED'
                    }
                });

                // Audit: Bonus Ledger
                await tx.bonusLedger.create({
                    data: {
                        userId: r.id,
                        sourceUserId: newUser.id,
                        level: r.level,
                        amount: r.amount,
                        plan: plan_type,
                        type: `JOIN_BONUS_L${r.level}`,
                        incomeStatus: 'PAID'
                    }
                });
            }
        }

        return newUser;
    });

    // 5. POST-TRANSACTION: Generate SID (Non-blocking)
    try {
        await sidService.generateUniqueSID(user.id);
    } catch (e) {
        console.warn("SID generation deferred:", e.message);
    }

    // 6. POST-TRANSACTION: System Log
    try {
        await prisma.systemLog.create({
            data: {
                adminId: user.sponsor_id || user.id,
                actionType: 'USER_REGISTRATION',
                targetUserId: user.id,
                description: `New ${plan_type} user joined with auto-payment verify: ${mobile}`
            }
        });
    } catch (e) {
        console.warn("System log failed:", e.message);
    }

    return user;
}

/**
 * Generate unique referral code (e.g., SDP-XXXXXX)
 */
async function generateReferralCode() {
    let isUnique = false;
    let code = '';
    while (!isUnique) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `SDP-${randomStr}`;
        const existing = await prisma.user.findUnique({
            where: { referral_code: code }
        });
        if (!existing) isUnique = true;
    }
    return code;
}

module.exports = {
    registerUser
};
