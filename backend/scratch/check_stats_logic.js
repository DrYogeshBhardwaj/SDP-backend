const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStats() {
    const revenueAgg = await prisma.transaction.aggregate({
        where: { category: 'REGISTRATION_FEE' },
        _sum: { amount: true }
    });
    console.log('Total In (REGISTRATION_FEE):', revenueAgg._sum.amount || 0);

    const upgradeAgg = await prisma.transaction.aggregate({
        where: { category: 'PLAN_UPGRADE' },
        _sum: { amount: true }
    });
    console.log('Total In (PLAN_UPGRADE):', upgradeAgg._sum.amount || 0);

    const allTx = await prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Recent Transactions:', allTx);

    process.exit(0);
}

checkStats();
