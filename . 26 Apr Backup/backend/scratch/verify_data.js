const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const uc = await prisma.user.count();
    const wc = await prisma.wallet.count();
    const tc = await prisma.transaction.count();
    const pc = await prisma.payout.count();
    
    console.log('--- DATABASE STATUS ---');
    console.log('Users:', uc);
    console.log('Wallets:', wc);
    console.log('Transactions:', tc);
    console.log('Payouts:', pc);
    
    if (uc > 0) {
        const users = await prisma.user.findMany({ select: { mobile: true, name: true } });
        console.log('\nUsers in DB:');
        users.forEach(u => console.log(`- ${u.mobile} (${u.name})`));
    }
    
    await prisma.$disconnect();
}
check();
