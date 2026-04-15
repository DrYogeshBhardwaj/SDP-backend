const { PrismaClient } = require('@prisma/client');

/**
 * Checks and awards milestone bonuses for a given user within a Prisma transaction.
 * This is executed inside the purchase transaction for strict atomicity.
 * 
 * @param {string} userId - The ID of the user to check (e.g. the referrer)
 * @param {object} tx - The Prisma transaction object
 */
const checkAndAwardMilestones = async (userId, tx) => {
    // 1. Fetch all active referrals where this user is the referrer
    const networkReferrals = await tx.referral.findMany({
        where: {
            referrerId: userId,
            status: 'ACTIVE'
        },
        include: {
            referredUser: {
                select: { role: true }
            }
        }
    });

    // 2. Calculate Total Points
    // Weight: BASIC = 1, BUSINESS/SEEDER = 4
    let totalPoints = 0;
    for (const ref of networkReferrals) {
        const role = ref.referredUser.role;
        if (role === 'BUSINESS' || role === 'SEEDER') {
            totalPoints += 4;
        } else {
            totalPoints += 1;
        }
    }

    // 3. Fetch achieving user's role to determine reward type
    const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    const isBusinessAchiever = (user.role === 'BUSINESS' || user.role === 'SEEDER');

    // 4. Fetch all active ranks
    const allRanks = await tx.rankConfig.findMany({
        where: { active: true },
        orderBy: { pointsRequired: 'asc' }
    });

    // 5. Determine and award achieved ranks
    for (const rank of allRanks) {
        if (totalPoints >= rank.pointsRequired) {
            // Determine bonus amount based on achiever's role
            const bonusAmount = isBusinessAchiever ? rank.businessBonus : rank.basicBonus;
            
            if (bonusAmount <= 0) continue;

            // Check if already achieved
            const existingUserRank = await tx.userRank.findUnique({
                where: {
                    userId_rankId: {
                        userId: userId,
                        rankId: rank.id
                    }
                }
            });

            if (!existingUserRank) {
                // Award the milestone!
                
                // A. Anchor Wallet (Derived Wallet Balance handles credits)
                await tx.walletCash.upsert({
                    where: { userId: userId },
                    update: { },
                    create: { userId: userId }
                });

                // B. Create Transaction Log (Using txStatus)
                await tx.transaction.create({
                    data: {
                        userId: userId,
                        type: 'BONUS',
                        amount: bonusAmount,
                        credit: bonusAmount,
                        description: `Milestone Bonus: ${rank.name} rank achieved!`,
                        txStatus: 'COMPLETED'
                    }
                });

                // C. Create Bonus Ledger Entry
                await tx.bonusLedger.create({
                    data: {
                        userId: userId,
                        amount: bonusAmount,
                        type: 'MILESTONE',
                        sourceUserId: null,
                        incomeStatus: 'PAID'
                    }
                });

                // D. Record Achievement
                await tx.userRank.create({
                    data: {
                        userId: userId,
                        rankId: rank.id
                    }
                });

                // E. System Log
                const masterAdmin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
                if (masterAdmin) {
                    await tx.systemLog.create({
                        data: {
                            adminId: masterAdmin.id,
                            actionType: 'MILESTONE_BONUS',
                            targetUserId: userId,
                            description: `Auto-credited ${rank.name} milestone bonus of ₹${bonusAmount} (Points: ${totalPoints})`
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
