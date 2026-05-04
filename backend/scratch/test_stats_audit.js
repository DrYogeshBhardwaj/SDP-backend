const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStats() {
    console.log("--- TESTING STATS AUDIT ---");
    
    // Check current stats
    const revenueAgg = await prisma.transaction.aggregate({
        where: { 
            category: { in: ['REGISTRATION_FEE', 'PLAN_UPGRADE'] },
            type: 'CREDIT' 
        },
        _sum: { amount: true }
    });
    console.log('Total Revenue:', revenueAgg._sum.amount || 0);

    const wallets = await prisma.wallet.findMany({ where: { type: 'CASH' } });
    const totalLiability = wallets.reduce((acc, w) => acc + w.balance, 0);
    console.log('Total Liability:', totalLiability);

    process.exit(0);
}

testStats();
