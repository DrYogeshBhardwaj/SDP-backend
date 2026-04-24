const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Bonus Service - Sinaank Therapy V1
 * Handles Ladder and Rank bonuses based on network size.
 */

const LADDER_BONUSES = [
    { threshold: 5, amount: 500 },
    { threshold: 10, amount: 1000 },
    { threshold: 20, amount: 3000 },
    { threshold: 50, amount: 10000 },
    { threshold: 100, amount: 25000 },
    { threshold: 200, amount: 40000 }
];

const RANK_BONUSES = [
    { threshold: 50, amount: 2000 },
    { threshold: 100, amount: 5000 },
    { threshold: 300, amount: 15000 },
    { threshold: 700, amount: 30000 },
    { threshold: 1500, amount: 65000 }
];

/**
 * Checks and awards bonuses to a user and their sponsors.
 */
async function checkAndAwardBonuses(userId, tx) {
    const client = tx || prisma;

    const user = await client.user.findUnique({
        where: { id: userId },
        include: { cash: true }
    });

    if (!user) return;

    // 1. Check Ladder Bonus (Directs)
    for (const bonus of LADDER_BONUSES) {
        if (user.directCount >= bonus.threshold) {
            const bonusId = `LADDER_${bonus.threshold}`;
            await awardOneTimeBonus(user, bonusId, bonus.amount, "Ladder Bonus", client);
        }
    }

    // 2. Check Rank Bonus (Team)
    for (const bonus of RANK_BONUSES) {
        if (user.teamCount >= bonus.threshold) {
            const bonusId = `RANK_${bonus.threshold}`;
            await awardOneTimeBonus(user, bonusId, bonus.amount, "Rank Bonus", client);
        }
    }
}

/**
 * Helper to award a one-time bonus with audit logs.
 */
async function awardOneTimeBonus(user, bonusId, amount, label, client) {
    // Check if already awarded
    const existing = await client.bonusLedger.findFirst({
        where: {
            userId: user.id,
            type: bonusId
        }
    });

    if (existing) return;

    // 1. Update Wallet
    await client.walletCash.update({
        where: { userId: user.id },
        data: { balance: { increment: amount } }
    });

    // 2. Create Transaction Log
    await client.transaction.create({
        data: {
            userId: user.id,
            amount: amount,
            credit: amount,
            type: 'BONUS',
            description: `${label} - ${bonusId}`,
            txStatus: 'COMPLETED'
        }
    });

    // 3. Create Bonus Ledger Entry
    await client.bonusLedger.create({
        data: {
            userId: user.id,
            amount: amount,
            type: bonusId,
            incomeStatus: 'PAID'
        }
    });

    console.log(`[BONUS] Awarded ${amount} to ${user.mobile} for ${bonusId}`);
}

module.exports = {
    checkAndAwardBonuses
};
