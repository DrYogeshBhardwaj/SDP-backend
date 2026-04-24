const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    const ghostUsers = await prisma.user.findMany({
        where: {
            OR: [
                { mobile: { contains: '\t' } },
                { mobile: '921002122' } 
            ]
        }
    });

    const ids = ghostUsers.map(u => u.id);
    if (ids.length > 0) {
        console.log(`Deleting ${ids.length} ghost users...`);
        await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
        await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
        await prisma.payout.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        console.log("Cleanup complete.");
    } else {
        console.log("No ghost users found.");
    }
    await prisma.$disconnect();
}

cleanup();
