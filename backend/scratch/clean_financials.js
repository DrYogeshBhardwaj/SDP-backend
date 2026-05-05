const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
    console.log("--- STARTING FINANCIAL CLEANUP ---");

    // 1. Get all FREE users
    const freeUsers = await prisma.user.findMany({
        where: { plan: 'FREE' },
        select: { id: true, mobile: true }
    });
    const freeUserIds = freeUsers.map(u => u.id);
    console.log(`Found ${freeUserIds.length} FREE users.`);

    // 2. Delete revenue records for FREE users (REGISTRATION_FEE and PLAN_UPGRADE)
    const deletedRevenue = await prisma.transaction.deleteMany({
        where: {
            userId: { in: freeUserIds },
            category: { in: ['REGISTRATION_FEE', 'PLAN_UPGRADE'] },
            type: 'CREDIT'
        }
    });
    console.log(`Deleted ${deletedRevenue.count} revenue records for FREE users.`);

    // 3. Revert commissions where the referral source (fromUserId) is now FREE
    const commissionsToRevert = await prisma.transaction.findMany({
        where: {
            fromUserId: { in: freeUserIds },
            category: 'BONUS',
            type: 'CREDIT'
        }
    });
    console.log(`Found ${commissionsToRevert.length} commissions to revert.`);

    for (const comm of commissionsToRevert) {
        console.log(`Reverting ₹${comm.amount} from ${comm.userId} (source: ${comm.fromUserId})...`);
        
        // Decrement wallet
        await prisma.wallet.updateMany({
            where: { userId: comm.userId, type: 'CASH' },
            data: { balance: { decrement: comm.amount } }
        });

        // Delete the bonus transaction
        await prisma.transaction.delete({ where: { id: comm.id } });
    }

    // 4. Final Sync: Ensure all CASH wallets match the sum of their transactions
    console.log("Synchronizing all CASH wallets...");
    const allWallets = await prisma.wallet.findMany({ where: { type: 'CASH' } });
    for (const wallet of allWallets) {
        const txSum = await prisma.transaction.aggregate({
            where: { userId: wallet.userId, type: { in: ['CREDIT', 'DEBIT'] } },
            _sum: { amount: true }
        });
        
        // This is a simplified sync, in reality we need to handle CREDIT vs DEBIT correctly
        const credits = await prisma.transaction.aggregate({
            where: { userId: wallet.userId, type: 'CREDIT' },
            _sum: { amount: true }
        });
        const debits = await prisma.transaction.aggregate({
            where: { userId: wallet.userId, type: 'DEBIT' },
            _sum: { amount: true }
        });

        const newBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);
        
        if (wallet.balance !== newBalance) {
            console.log(`Updating balance for User ${wallet.userId}: ${wallet.balance} -> ${newBalance}`);
            await prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance }
            });
        }
    }

    console.log("--- CLEANUP COMPLETE ---");
    await prisma.$disconnect();
}

clean().catch(console.error);
