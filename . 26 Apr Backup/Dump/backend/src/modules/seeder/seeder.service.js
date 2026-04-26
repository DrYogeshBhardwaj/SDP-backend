const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate unique referral code (e.g., SDP-XXXXXX)
const generateReferralCode = async () => {
    let isUnique = false;
    let code = '';
    while (!isUnique) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `SDP-${randomStr}`;
        const existing = await prisma.user.findUnique({
            where: { referral_code: code }
        });
        if (!existing) {
            isUnique = true;
        }
    }
    return code;
};

/**
 * Shared Activation Logic
 * This handles transitioning PENDING to ACTIVE and distributing bonuses.
 */
const activateJoiningInternal = async (userId, plan) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { referredBy: true }
    });

    if (!user) throw new Error('User not found');
    if (user.kit_activated) return { userId: user.id, alreadyActive: true };

    const referralCode = await generateReferralCode();
    const payouts = plan === 'business' ? { l1: 450, l2: 250, l3: 150 } : { l1: 120, l2: 80, l3: 50 };

    return await prisma.$transaction(async (tx) => {
        // 1. Activate User
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                status: 'ACTIVE',
                kit_activated: true,
                referral_code: referralCode,
                validity_expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            }
        });

        // 2. Activate Referrals & Award Bonuses
        // We look for existing PENDING referrals for this user
        const pendingRefs = await tx.referral.findMany({
            where: { referredUserId: userId, referralStatus: 'PENDING' }
        });

        for (const ref of pendingRefs) {
            // Award based on level
            let amount = 0;
            let type = '';
            if (ref.level === 1) { amount = payouts.l1; type = 'DIRECT'; }
            else if (ref.level === 2) { amount = payouts.l2; type = 'LEVEL2'; }
            else if (ref.level === 3) { amount = payouts.l3; type = 'LEVEL3'; }

            if (amount > 0) {
                await awardBonusInternal(tx, ref.referrerId, userId, amount, type, ref.level, 'JOIN');
            }
        }

        return { userId: updatedUser.id, role: updatedUser.role, referral_code: updatedUser.referral_code };
    });
};

/**
 * Shared Upgrade Logic
 * This handles transitioning BASIC to BUSINESS and distributing bonuses.
 */
const upgradeUserInternal = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { referredBy: true }
    });

    if (!user) throw new Error('User not found');
    if (user.role === 'BUSINESS' || user.role === 'SEEDER' || user.role === 'ADMIN') {
        throw new Error('User is already at Business or higher plan');
    }
    if (!user.kit_activated) {
        throw new Error('User must activate Basic plan before upgrading');
    }

    const businessPayout = { l1: 450, l2: 250, l3: 150 };

    return await prisma.$transaction(async (tx) => {
        // 1. Update User to BUSINESS
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                role: 'BUSINESS',
                upgradeIncluded: true
            }
        });

        // 2. Award Business Bonuses (Full Business Bonus)
        // For upgrades, we use a different type context 'Upgrade' to be additive
        const l1Ref = await tx.referral.findFirst({ where: { referredUserId: userId, level: 1 } });
        
        if (l1Ref) {
            const l1Referrer = await tx.user.findUnique({ where: { id: l1Ref.referrerId } });
            if (l1Referrer && l1Referrer.status === 'ACTIVE') {
                await awardBonusInternal(tx, l1Referrer.id, userId, businessPayout.l1, 'DIRECT', 1, 'Upgrade');
                
                // Level 2
                const l1RefOfL1 = await tx.referral.findFirst({ where: { referredUserId: l1Referrer.id, level: 1 } });
                if (l1RefOfL1) {
                    const l2ReferrerId = l1RefOfL1.referrerId;
                    const l2Referrer = await tx.user.findUnique({ where: { id: l2ReferrerId } });
                    if (l2Referrer && l2Referrer.status === 'ACTIVE') {
                        await awardBonusInternal(tx, l2Referrer.id, userId, businessPayout.l2, 'LEVEL2', 2, 'Upgrade');
                        
                        // Level 3
                        const l1RefOfL2 = await tx.referral.findFirst({ where: { referredUserId: l2Referrer.id, level: 1 } });
                        if (l1RefOfL2) {
                            const l3ReferrerId = l1RefOfL2.referrerId;
                            const l3Referrer = await tx.user.findUnique({ where: { id: l3ReferrerId } });
                            if (l3Referrer && l3Referrer.status === 'ACTIVE') {
                                await awardBonusInternal(tx, l3Referrer.id, userId, businessPayout.l3, 'LEVEL3', 3, 'Upgrade');
                            }
                        }
                    }
                }
            }
        }

        return { userId: updatedUser.id, role: updatedUser.role };
    });
};

const awardBonusInternal = async (tx, referrerId, sourceUserId, amount, type, level, context = 'JOIN') => {
    // 1. Create/Update Referral entry
    await tx.referral.upsert({
        where: { referredUserId_level: { referredUserId: sourceUserId, level: level } },
        update: { referralStatus: 'ACTIVE', referrerId: referrerId },
        create: { referrerId: referrerId, referredUserId: sourceUserId, level: level, referralStatus: 'ACTIVE' }
    });

    // 2. Transaction history
    await tx.transaction.create({
        data: {
            userId: referrerId,
            type: 'BONUS',
            amount: amount,
            credit: amount,
            description: `Level ${level} Bonus from ${context} (${type})`,
            txStatus: 'COMPLETED'
        }
    });

    const bonusType = `${context}_${type}`;

    // 3. Bonus Ledger for tracking (Idempotent update to PAID)
    await tx.bonusLedger.upsert({
        where: { sourceUserId_type: { sourceUserId: sourceUserId, type: bonusType } },
        update: { incomeStatus: 'PAID', amount: amount },
        create: { 
            userId: referrerId, 
            amount, 
            type: bonusType, 
            sourceUserId, 
            incomeStatus: 'PAID' 
        }
    });
};

module.exports = {
    activateJoiningInternal,
    upgradeUserInternal,
    awardBonusInternal,
    generateReferralCode
};
