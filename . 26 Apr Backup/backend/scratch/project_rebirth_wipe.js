const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function projectRebirthWipe() {
    console.log("--- PROJECT REBIRTH: DESTRUCTIVE CLEANUP START ---");

    try {
        // 1. Find the Main User (Poonam / Root Node)
        const mainUser = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
        
        if (!mainUser) {
            console.error("CRITICAL ERROR: Main user 9211755211 not found! Aborting wipe to prevent total data loss.");
            return;
        }

        const mainId = mainUser.id;
        console.log(`Preserving Root Node: ${mainUser.mobile} (ID: ${mainId})`);

        // 2. Clear Dependent Data for everyone ELSE
        // Filter: userId NOT equal to mainId
        
        console.log("Cleaning up transactions...");
        await prisma.transaction.deleteMany({ where: { userId: { not: mainId } } });

        console.log("Cleaning up wallets...");
        await prisma.wallet.deleteMany({ where: { userId: { not: mainId } } });

        console.log("Cleaning up payouts...");
        await prisma.payout.deleteMany({ where: { userId: { not: mainId } } });

        console.log("Cleaning up therapy sessions...");
        await prisma.therapySession.deleteMany({ where: { userId: { not: mainId } } });

        console.log("Cleaning up support queries...");
        await prisma.supportQuery.deleteMany({ where: { userId: { not: mainId } } });

        // 3. Clear Global Sessions
        console.log("Cleaning up global sessions (OTP/Payments)...");
        await prisma.otpSession.deleteMany({});
        await prisma.paymentOrder.deleteMany({});

        // 4. Delete Users (except main)
        console.log("DELETING PARTNER NETWORK...");
        const deleteCount = await prisma.user.deleteMany({
            where: { id: { not: mainId } }
        });

        console.log(`Successfully purged ${deleteCount.count} accounts.`);
        
        // 5. Reset Root Node Stats (Optional but cleaner)
        await prisma.user.update({
            where: { id: mainId },
            data: {
                sponsorId: null, // Root node has no sponsor
                minutesBalance: 3600 // Reset to fresh balance
            }
        });

        console.log("--- REBIRTH CLEANUP COMPLETE ---");
    } catch (err) {
        console.error("REBIRTH WIPE FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

projectRebirthWipe();
