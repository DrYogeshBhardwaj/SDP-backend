const { PrismaClient } = require('@prisma/client');

/**
 * Checks and awards milestone bonuses for a given user within a Prisma transaction.
 * This is executed inside the purchase transaction for strict atomicity.
 * 
 * @param {string} userId - The ID of the user to check (e.g. the referrer)
 * @param {object} tx - The Prisma transaction object
 */
const checkAndAwardMilestones = async (userId, tx) => {
    // 1. Calculate Direct Referrals (Level 1)
    const directCount = await tx.referral.count({
        where: {
            referrerId: userId,
            level: 1,
            status: 'ACTIVE'
        }
    });

    // 2. Calculate Network Referrals (All Levels where referrerId is the user)
    // In our 2-depth system, this includes level 1 and level 2.
    const networkCount = await tx.referral.count({
        where: {
            referrerId: userId,
            status: 'ACTIVE'
        }
    });

    // 3. Fetch all active ranks
    const allRanks = await tx.rankConfig.findMany({
        where: { active: true },
        orderBy: { bonusAmount: 'asc' } // Lowest to highest bonus
    });

    // 4. Determine achieved ranks purely mathematically
    for (const rank of allRanks) {
        // Skip base ranks with no bonus to distribute
        if (rank.bonusAmount <= 0) continue;

        if (directCount >= rank.directRequired && networkCount >= rank.networkRequired) {
            // User mathematically qualifies. Check if they already achieved it.
            const existingUserRank = await tx.userRank.findUnique({
                where: {
                    userId_rankId: {
                        userId: userId,
                        rankId: rank.id
                    }
                }
            });

            if (!existingUserRank) {
                // Not achieved yet! strictly award the milestone.

                // A. Credit Wallet Cash
                await tx.walletCash.upsert({
                    where: { userId: userId },
                    update: { balance: { increment: rank.bonusAmount } },
                    create: { userId: userId, balance: rank.bonusAmount }
                });

                // B. Create BONUS Transaction Log
                await tx.transaction.create({
                    data: {
                        userId: userId,
                        type: 'BONUS',
                        amount: rank.bonusAmount,
                        description: `Milestone Bonus Achieved: ${rank.name}`,
                        status: 'COMPLETED'
                    }
                });

                // C. Create Bonus Ledger Entry
                await tx.bonusLedger.create({
                    data: {
                        userId: userId,
                        amount: rank.bonusAmount,
                        type: 'MILESTONE',
                        sourceUserId: null // System bonus
                    }
                });

                // D. Stigmatize UserRank (Enforces duplicate protection)
                await tx.userRank.create({
                    data: {
                        userId: userId,
                        rankId: rank.id
                    }
                });

                // E. Write immutable SystemLog for Audit (Using master admin alias)
                const masterAdmin = await tx.user.findFirst({
                    where: { role: 'ADMIN' }
                });

                if (masterAdmin) {
                    await tx.systemLog.create({
                        data: {
                            adminId: masterAdmin.id,
                            actionType: 'MILESTONE_BONUS',
                            targetUserId: userId,
                            description: `System auto-credited ${rank.name} milestone bonus of ₹${rank.bonusAmount}`
                        }
                    });
                }
            }
        }
    }
};

module.exports = {
    checkAndAwardMilestones
};
