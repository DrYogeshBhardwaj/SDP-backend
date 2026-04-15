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

module.exports = {
    getDerivedBalance,
    getSystemWallet
};
