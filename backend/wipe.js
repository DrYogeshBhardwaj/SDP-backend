const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Wiping all user data from the database...');

    await prisma.announcement.deleteMany();
    await prisma.message.deleteMany();
    await prisma.systemExpense.deleteMany();
    await prisma.userRank.deleteMany();
    await prisma.systemLog.deleteMany();
    await prisma.bonusLedger.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.walletCash.deleteMany();
    await prisma.walletMinute.deleteMany();
    await prisma.user.deleteMany();

    console.log('All user data deleted successfully!');

    // Create default products if they don't exist
    const p1 = await prisma.product.upsert({
        where: { name: 'Personal Pack' },
        update: {},
        create: {
            name: 'Personal Pack',
            price: 178.0,
            type: 'PERSONAL',
            minutes_allocated: 3650,
            description: '10 mins daily for 365 days',
            isActive: true
        }
    });

    const p2 = await prisma.product.upsert({
        where: { name: 'Family Kit' },
        update: {},
        create: {
            name: 'Family Kit',
            price: 580.0,
            type: 'FAMILY',
            minutes_allocated: 0,
            description: 'Seeder Upgrade Kit',
            isActive: true
        }
    });

    console.log('Default products created/verified.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
