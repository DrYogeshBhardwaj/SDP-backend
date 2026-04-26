const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculates the derived wallet balance for a user from the transaction ledger.
 * Formula: Sum(credit) - Sum(debit) for all COMPLETED or PAID transactions.
 * Note: PENDING debits (like requested payouts) should also be considered as "locked" 
 * but for the final balance, we follow the user's rule: sum(credit) - sum(debit).
 */
const getDerivedBalance = async (userId) => {
    try {
        const result = await prisma.transaction.aggregate({
            where: {
                userId,
                txStatus: { in: ['COMPLETED', 'PAID', 'PENDING'] }
            },
            _sum: {
                credit: true,
                debit: true
            }
        });

        const credits = result._sum.credit || 0;
        const debits = result._sum.debit || 0;
        return credits - debits;
    } catch (error) {
        console.error(`Error calculating balance for user ${userId}:`, error);
        return 0;
    }
};

/**
 * System Wallet calculation: Total Joins (Purchases) - Total Income PAID - Total Payouts PAID
 */
const getSystemWallet = async () => {
    try {
        const [purchases, incomePaid, payoutsPaid] = await Promise.all([
            prisma.transaction.aggregate({
                where: { type: 'PURCHASE', txStatus: 'COMPLETED' },
                _sum: { credit: true, debit: true, amount: true }
            }),
            prisma.bonusLedger.aggregate({
                where: { incomeStatus: 'PAID' },
                _sum: { amount: true }
            }),
            prisma.payout.aggregate({
                where: { payoutStatus: 'PAID' },
                _sum: { amount: true }
            })
        ]);

        // Note: joinMoney is total purchase amounts
        // In our system, PURCHASE is a Transaction with 'amount' as the price.
        // Let's use the explicit 'amount' field for purchases.
        const joinMoney = purchases._sum.amount || 0;
        const income = incomePaid._sum.amount || 0;
        const withdrawals = payoutsPaid._sum.amount || 0;

        return joinMoney - income - withdrawals;
    } catch (error) {
        console.error("Error calculating system wallet:", error);
        return 0;
    }
};

/**
 * Weekly Auto-Payout Request Trigger
 * Scans all users with a balance > 0 and creates a PENDING payout request.
 * Called every Sunday.
 */
const triggerWeeklyPayouts = async () => {
    try {
        console.log("[PAYOUT_CRON] Starting Weekly Payout Generation...");
        
        // 1. Get all users with positive balance
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            include: { cash: true }
        });

        let count = 0;
        for (const user of users) {
            const balance = await getDerivedBalance(user.id);
            
            if (balance > 0 && !user.cash?.activePayoutId) {
                // Create Payout Request
                await prisma.$transaction(async (tx) => {
                    const payout = await tx.payout.create({
                        data: {
                            userId: user.id,
                            amount: balance,
                            payoutStatus: 'PENDING',
                            remarks: 'Auto-generated Weekly Payout'
                        }
                    });

                    // Lock wallet for this payout
                    await tx.walletCash.update({
                        where: { userId: user.id },
                        data: { activePayoutId: payout.id }
                    });

                    // Create Debit Transaction (Locked)
                    await tx.transaction.create({
                        data: {
                            userId: user.id,
                            amount: balance,
                            debit: balance,
                            type: 'PAYOUT',
                            txStatus: 'PENDING',
                            referenceId: payout.id,
                            description: 'Weekly Payout Request (Awaiting Approval)'
                        }
                    });
                });
                count++;
            }
        }

        console.log(`[PAYOUT_CRON] Finished. Created ${count} payout requests.`);
        return count;
    } catch (error) {
        console.error("Error triggering weekly payouts:", error);
    }
};

module.exports = {
    getDerivedBalance,
    getSystemWallet,
    triggerWeeklyPayouts
};
