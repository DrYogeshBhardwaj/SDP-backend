const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const wallets = await prisma.wallet.findMany({
        where: { type: 'CASH' },
        include: { user: { select: { mobile: true, name: true } } }
    });
    console.log('--- CASH WALLETS ---');
    wallets.forEach(w => {
        console.log(`User: ${w.user.mobile} (${w.user.name}), Balance: ${w.balance}`);
    });

    const transactions = await prisma.transaction.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { mobile: true } } }
    });
    console.log('\n--- RECENT TRANSACTIONS ---');
    transactions.forEach(t => {
        console.log(`User: ${t.user.mobile}, Amount: ${t.amount}, Type: ${t.type}, Category: ${t.category}, Desc: ${t.description}`);
    });

    const payouts = await prisma.payout.findMany();
    console.log('\n--- PAYOUTS ---');
    console.log(`Count: ${payouts.length}`);

    await prisma.$disconnect();
}

debug();
