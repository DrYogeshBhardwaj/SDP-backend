const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateTestData() {
    console.log("--- REBUILDING PROFITABLE FINANCIAL DATA ---");
    
    const users = await prisma.user.findMany({ include: { wallets: true } });
    
    // Clear old mock data
    await prisma.transaction.deleteMany({ where: { category: { in: ['REGISTRATION_FEE', 'STREAK_BONUS', 'REFERRAL_INCOME', 'BONUS'] } } });
    await prisma.payout.deleteMany({});

    for (const user of users) {
        let totalToBalance = 0;
        
        // Ensure UPI
        if (!user.upiId) {
            await prisma.user.update({ where: { id: user.id }, data: { upiId: `${user.mobile}@upi` } });
        }

        // 1. HIGH REVENUE TRANSACTION (Registration Fee)
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 2000,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: 'System Rebirth Subscription'
            }
        });

        // 2. LOW LIABILITY TRANSACTIONS (Commissions)
        const txns = [
            { amount: 300, desc: 'Direct Referral Commission', cat: 'BONUS' },
            { amount: 200, desc: 'Team Growth Bonus', cat: 'BONUS' }
        ];

        for (const t of txns) {
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: t.amount,
                    type: 'CREDIT',
                    category: t.cat,
                    description: t.desc
                }
            });
            totalToBalance += t.amount;
        }

        // Update Wallet to MATCH exactly
        const cashWallet = user.wallets.find(w => w.type === 'CASH');
        if (cashWallet) {
            await prisma.wallet.update({
                where: { id: cashWallet.id },
                data: { balance: totalToBalance }
            });
        }
    }

    // Payout requests
    for (let i = 0; i < 2; i++) {
        await prisma.payout.create({
            data: { userId: users[i].id, amount: 500, status: 'PENDING' }
        });
    }

    console.log("--- PROFITABLE DATA SYNC COMPLETE ---");
}

populateTestData().finally(() => prisma.$disconnect());
