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

        // 1. Determine rewards based on product
        let levelRewards = [0, 0, 0];
        let newRole = 'BASIC';

        if (product.name === 'Basic Plan') {
            levelRewards = [120, 80, 50];
            newRole = 'BASIC';
        } else if (product.name === 'Business Plan' || product.name === 'Upgrade to Business') {
            levelRewards = [450, 250, 150];
            newRole = 'BUSINESS';
        }

        const isRenewal = product.name.includes('Renewal');

        // 2. Fetch current user for validity extension and role update
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { validity_expiry: true, role: true }
        });

        // 3. Handle Referral Logic (Iterative 3-level)
        const referralActions = async (tx, buyerId, startReferralCode) => {
            if (!startReferralCode || isRenewal) return;

            let currentReferrer = await tx.user.findUnique({
                where: { referral_code: startReferralCode },
                include: { referredBy: { where: { level: 1 } } }
            });

            for (let level = 1; level <= 3; level++) {
                if (!currentReferrer) break;
                
                // Security checks for Level 1
                if (level === 1) {
                    if (currentReferrer.id === buyerId) break;
                    // Seeders/Active users only
                    if (currentReferrer.role !== 'SEEDER' || currentReferrer.status !== 'ACTIVE') break;
                    
                    const existingRef = await tx.referral.findFirst({
                        where: { referredUserId: buyerId, level: 1 }
                    });
                    if (existingRef) break;
                }

                const amount = levelRewards[level - 1];
                if (amount <= 0) break;

                // A. Create PENDING Referral Mapping
                await tx.referral.create({
                    data: {
                        referrerId: currentReferrer.id,
                        referredUserId: buyerId,
                        level: level,
                        status: 'PENDING'
                    }
                });

                // B. Create PENDING Transaction Log
                await tx.transaction.create({
                    data: {
                        userId: currentReferrer.id,
                        type: 'BONUS',
                        amount: amount,
                        credit: amount,
                        source: user.mobile || buyerId,
                        description: `Level ${level} Bonus (Pending Kit Activation) from ${req.user?.name || 'User'}`,
                        status: 'PENDING'
                    }
                });

                // C. Create PENDING Bonus Ledger Entry
                await tx.bonusLedger.create({
                    data: {
                        userId: currentReferrer.id,
                        amount: amount,
                        type: level === 1 ? 'DIRECT' : (level === 2 ? 'LEVEL2' : 'LEVEL3'),
                        sourceUserId: buyerId,
                        status: 'PENDING'
                    }
                });

                // Move to next referrer in chain
                const parentRef = await tx.referral.findFirst({
                    where: { referredUserId: currentReferrer.id, level: 1 },
                    include: { referrer: true }
                });
                
                if (parentRef && parentRef.referrer) {
                    currentReferrer = parentRef.referrer;
                } else {
                    currentReferrer = null;
                }
            }
        };

        await prisma.$transaction(async (tx) => {
            // A. Update user role and validity
            let nextExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            if (isRenewal && user.validity_expiry) {
                const currentExpiry = new Date(user.validity_expiry);
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                nextExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            }

            await tx.user.update({
                where: { id: userId },
                data: { 
                    role: newRole,
                    validity_expiry: nextExpiry
                }
            });

            // B. Reset wallet minutes
            await tx.walletMinute.upsert({
                where: { userId },
                update: { balance: product.minutes_allocated },
                create: { userId, balance: product.minutes_allocated }
            });

            // C. Create transaction log
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'PURCHASE',
                    amount: product.price,
                    description: `Purchase: ${product.name}${isRenewal ? ' (Renewal)' : ''}`,
                    txStatus: 'COMPLETED'
                }
            });

            // D. Referral Chain
            await referralActions(tx, userId, referral_code);
        });

        return successResponse(res, 200, 'Purchase successful', {
            product: product.name,
            new_role: newRole
        });

    } catch (error) {
        console.error("Purchase error:", error);
        return errorResponse(res, 500, error.message);
    }
};


module.exports = {
    purchaseProduct
};
