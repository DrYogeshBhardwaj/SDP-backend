const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { checkAndAwardMilestones } = require('../referral/milestone.service');

/**
 * Activates a user's kit, triggering pending referral bonuses and milestone checks.
 * This is an ADMIN-only operation.
 */
const activateKit = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return errorResponse(res, 400, 'User ID is required');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        if (user.kit_activated) {
            return errorResponse(res, 400, 'Kit is already activated for this user');
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Mark User as Kit Activated
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { kit_activated: true }
            });

            // 2. Find all PENDING referrals for this user
            const pendingReferrals = await tx.referral.findMany({
                where: { referredUserId: userId, referralStatus: 'PENDING' }
            });

            for (const referral of pendingReferrals) {
                // A. Activate the Referral Record
                await tx.referral.update({
                    where: { id: referral.id },
                    data: { referralStatus: 'ACTIVE' }
                });

                // B. Find and Complete PENDING Bonus Ledger
                let bonusType = 'DIRECT';
                if (referral.level === 2) bonusType = 'LEVEL2';
                if (referral.level === 3) bonusType = 'LEVEL3';

                const bonusLedger = await tx.bonusLedger.findFirst({
                    where: { 
                        userId: referral.referrerId, 
                        sourceUserId: userId, 
                        type: bonusType,
                        incomeStatus: 'PENDING'
                    }
                });


                if (bonusLedger) {
                    // Update Ledger status
                    await tx.bonusLedger.update({
                        where: { id: bonusLedger.id },
                        data: { incomeStatus: 'PAID' }
                    });

                    // 71-76: MUTABLE BALANCE UPDATE REMOVED 
                    // Wallet is now derived from Transaction ledger

                    // Complete the Transaction Log
                    // Note: We search for the pending transaction log to complete it
                    const pendingTransaction = await tx.transaction.findFirst({
                        where: { 
                            userId: referral.referrerId, 
                            type: 'BONUS', 
                            txStatus: 'PENDING',
                            description: { contains: userId.substring(0, 8) } // Using a more robust match if possible, or just amount/date
                        }
                    });
                    
                    // Fallback to searching by description pattern if exact match not easy
                    const finalTx = pendingTransaction || await tx.transaction.findFirst({
                        where: {
                            userId: referral.referrerId,
                            type: 'BONUS',
                            txStatus: 'PENDING',
                            amount: bonusLedger.amount
                        }
                    });

                    if (finalTx) {
                        await tx.transaction.update({
                            where: { id: finalTx.id },
                            data: { 
                                txStatus: 'COMPLETED',
                                transactionDate: new Date(), // Update to activation date
                                description: `Bonus Activated: ${bonusType} from ${user.name || 'User'}`
                            }
                        });
                    }
                }

                // C. Trigger Milestone Checks for Referrer
                // This will now see the Referral as 'ACTIVE'
                await checkAndAwardMilestones(referral.referrerId, tx);
            }

            return { userId: updatedUser.id, activated: true, referralsProcessed: pendingReferrals.length };
        });

        return successResponse(res, 200, 'Kit activated successfully', result);

    } catch (error) {
        console.error("Kit Activation Error:", error);
        return errorResponse(res, 500, 'Failed to activate kit', error.message || error.toString());
    }
};

module.exports = {
    activateKit
};
