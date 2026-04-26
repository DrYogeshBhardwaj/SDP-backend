const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixChain() {
    console.log("--- FIXING MLM CHAIN ---");
    
    const rootUser = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
    const directUser = await prisma.user.findUnique({ where: { mobile: '8851168290' } });
    const teamUser = await prisma.user.findUnique({ where: { mobile: '9625645211' } });

    if (!rootUser || !directUser || !teamUser) {
        return console.log("Users not found. Cannot fix.");
    }

    // 1. Link 8851168290 to 9211755211
    await prisma.user.update({
        where: { id: directUser.id },
        data: { sponsorId: rootUser.id }
    });
    console.log("✅ Linked 8851168290 to 9211755211");

    // 2. Credit commissions
    // 9211755211 gets ₹100 from 8851168290 (Level 1)
    await prisma.wallet.updateMany({
        where: { userId: rootUser.id, type: 'CASH' },
        data: { balance: { increment: 100 } }
    });
    await prisma.transaction.create({
        data: {
            userId: rootUser.id,
            amount: 100,
            type: 'CREDIT',
            category: 'BONUS',
            description: `Direct Comm from 8851168290`
        }
    });

    // 9211755211 gets ₹80 from 9625645211 (Level 2)
    await prisma.wallet.updateMany({
        where: { userId: rootUser.id, type: 'CASH' },
        data: { balance: { increment: 80 } }
    });
    await prisma.transaction.create({
        data: {
            userId: rootUser.id,
            amount: 80,
            type: 'CREDIT',
            category: 'BONUS',
            description: `Team Comm from 9625645211`
        }
    });

    console.log("✅ Commission Credited & Transactions Created for 9211755211: ₹180");
}

fixChain().finally(() => prisma.$disconnect());
