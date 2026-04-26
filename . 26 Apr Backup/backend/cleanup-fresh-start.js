const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function freshStart() {
    console.log("--- STARTING FRESH START CLEANUP ---");
    
    try {
        // 1. Find the primary user to keep
        const masterUser = await prisma.user.findUnique({
            where: { mobile: '9211755211' }
        });

        if (!masterUser) {
            console.error("Master user 9211755211 not found! Aborting for safety.");
            return;
        }

        const masterId = masterUser.id;

        // 2. Delete all related data for other users first (Relations)
        console.log("Cleaning up mock relations...");
        await prisma.payout.deleteMany({});
        await prisma.supportQuery.deleteMany({});
        await prisma.therapySession.deleteMany({});
        
        // 3. Delete transactions NOT belonging to master
        console.log("Pruning transaction history...");
        await prisma.transaction.deleteMany({
            where: { userId: { not: masterId } }
        });

        // 4. Delete wallets NOT belonging to master
        console.log("Removing auxiliary wallets...");
        await prisma.wallet.deleteMany({
            where: { userId: { not: masterId } }
        });

        // 5. Delete users (except master)
        console.log("Removing all users except Prime Admin...");
        const deleteCount = await prisma.user.deleteMany({
            where: { id: { not: masterId } }
        });

        // 6. Reset Master User to initial state
        console.log("Resetting Prime Admin baseline...");
        await prisma.user.update({
            where: { id: masterId },
            data: { 
                minutesBalance: 3600,
                dailyMinutesUsed: 0,
                totalMinutesConsumed: 0,
                upiId: null // Reset so it can be set again
            }
        });

        // Reset Master Wallets to 0
        await prisma.wallet.updateMany({
            where: { userId: masterId },
            data: { balance: 0 }
        });

        // Delete Master's Transactions for a true clean slate
        await prisma.transaction.deleteMany({
            where: { userId: masterId }
        });

        console.log(`--- CLEANUP COMPLETE ---`);
        console.log(`Deleted ${deleteCount.count} users. Prime Admin 9211755211 is now clean.`);

    } catch (err) {
        console.error("Cleanup failed:", err);
    }
}

freshStart().finally(() => prisma.$disconnect());
