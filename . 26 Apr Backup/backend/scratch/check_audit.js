const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const revCount = await prisma.transaction.count({ where: { category: 'REGISTRATION_FEE' } });
    console.log('Revenue Transactions Count:', revCount);

    const bonusCount = await prisma.transaction.count({ where: { category: 'BONUS' } });
    console.log('Bonus Transactions Count:', bonusCount);

    const users = await prisma.user.findMany({
        where: { role: 'BASIC' },
        include: { transactions: { where: { category: 'REGISTRATION_FEE' } } }
    });
    
    console.log('\nUsers without Revenue logs:');
    users.filter(u => u.transactions.length === 0).forEach(u => {
        console.log(`- ${u.mobile} (${u.name})`);
    });

    await prisma.$disconnect();
}
check();
