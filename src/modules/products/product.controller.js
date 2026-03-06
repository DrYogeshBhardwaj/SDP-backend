const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { checkAndAwardMilestones } = require('../referral/milestone.service');

const purchaseProduct = async (req, res) => {
    try {
        const { product_id, referral_code } = req.body;
        const userId = req.user.id;

        if (!product_id) {
            return errorResponse(res, 400, 'Product ID is required');
        }

        const product = await prisma.product.findUnique({
            where: { id: product_id }
        });

        if (!product || !product.isActive) {
            return errorResponse(res, 404, 'Product not found or inactive');
        }

        let referrer = null;
        if (referral_code) {
            referrer = await prisma.user.findUnique({
                where: { referral_code },
                include: { referredBy: true }
            });

            if (!referrer) {
                return errorResponse(res, 400, 'Invalid referral code');
            }
            if (referrer.id === userId) {
                return errorResponse(res, 400, 'Cannot use your own referral code');
            }
            if (referrer.role !== 'SEEDER' || referrer.status !== 'ACTIVE') {
                console.error(`Referral Validation Failed: Role=${referrer.role}, Status=${referrer.status}`);
                return errorResponse(res, 400, 'Referral code is not active or valid');
            }

            // Check if user already has a referrer
            const existingReferral = await prisma.referral.findFirst({
                where: { referredUserId: userId, level: 1 }
            });
            if (existingReferral) {
                return errorResponse(res, 400, 'User already has a referrer');
            }
        }

        // Role mapping based on product type
        const newRole = product.type === 'FAMILY' ? 'USER_580' : 'USER_178';

        await prisma.$transaction(async (tx) => {
            // 1. Update user role
            await tx.user.update({
                where: { id: userId },
                data: { role: newRole }
            });

            // 2. Reset wallet minutes strictly to product allocated amount
            await tx.walletMinute.upsert({
                where: { userId },
                update: { balance: product.minutes_allocated },
                create: {
                    userId,
                    balance: product.minutes_allocated
                }
            });

            // 3. Create transaction log (Append only)
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'PURCHASE',
                    amount: product.price,
                    description: `Purchased ${product.name} plan`,
                    status: 'COMPLETED'
                }
            });

            // 4. Handle Referral & Cash Wallet Logic
            if (referrer) {
                // Level 1: Direct Referral
                const level1Amount = 220;

                // Upsert Cash Wallet for Level 1
                await tx.walletCash.upsert({
                    where: { userId: referrer.id },
                    update: { balance: { increment: level1Amount } },
                    create: { userId: referrer.id, balance: level1Amount }
                });

                // Add Bonus Transaction for Level 1
                await tx.transaction.create({
                    data: {
                        userId: referrer.id,
                        type: 'BONUS',
                        amount: level1Amount,
                        description: `Level 1 Referral Bonus from ${req.user.name || 'User'}`,
                        status: 'COMPLETED'
                    }
                });

                // Add Bonus Ledger Entry for Level 1
                await tx.bonusLedger.create({
                    data: {
                        userId: referrer.id,
                        amount: level1Amount,
                        type: 'DIRECT',
                        sourceUserId: userId
                    }
                });

                // Add Referral mapping for Level 1
                await tx.referral.create({
                    data: {
                        referrerId: referrer.id,
                        referredUserId: userId,
                        level: 1
                    }
                });

                // Trigger Milestone checks for Level 1
                await checkAndAwardMilestones(referrer.id, tx);

                // Level 2: Indirect Referral
                const level1Referral = referrer.referredBy.find(r => r.level === 1);
                if (level1Referral) {
                    const level2ReferrerId = level1Referral.referrerId;
                    const level2Amount = 150;

                    // Check if level 2 referrer is an ACTIVE SEEDER
                    const level2Referrer = await tx.user.findUnique({
                        where: { id: level2ReferrerId }
                    });

                    if (level2Referrer && level2Referrer.role === 'SEEDER' && level2Referrer.status === 'ACTIVE') {
                        // Upsert Cash Wallet for Level 2
                        await tx.walletCash.upsert({
                            where: { userId: level2ReferrerId },
                            update: { balance: { increment: level2Amount } },
                            create: { userId: level2ReferrerId, balance: level2Amount }
                        });

                        // Add Bonus Transaction for Level 2
                        await tx.transaction.create({
                            data: {
                                userId: level2ReferrerId,
                                type: 'BONUS',
                                amount: level2Amount,
                                description: `Level 2 Referral Bonus from ${req.user.name || 'User'}`,
                                status: 'COMPLETED'
                            }
                        });

                        // Add Bonus Ledger Entry for Level 2
                        await tx.bonusLedger.create({
                            data: {
                                userId: level2ReferrerId,
                                amount: level2Amount,
                                type: 'LEVEL2',
                                sourceUserId: userId
                            }
                        });

                        // Add Referral mapping for Level 2
                        await tx.referral.create({
                            data: {
                                referrerId: level2ReferrerId,
                                referredUserId: userId,
                                level: 2
                            }
                        });

                        // Trigger Milestone checks for Level 2
                        await checkAndAwardMilestones(level2ReferrerId, tx);
                    }
                }
            }
        });

        return successResponse(res, 200, 'Purchase successful', {
            product: product.name,
            minutes_allocated: product.minutes_allocated,
            new_role: newRole
        });

    } catch (error) {
        console.error("Purchase 500 error:", error);
        return res.status(500).json({ success: false, message: 'Purchase failed', error: error.message, stack: error.stack });
    }
};

module.exports = {
    purchaseProduct
};
