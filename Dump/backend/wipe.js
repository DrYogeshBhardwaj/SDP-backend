const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Wiping all user data from the database...');

    // WIPE ALL RECORDS
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
    await prisma.user.deleteMany(); // DELETE EVERYTHING INCLUDING ADMINS

    console.log('All data wiped. Database is now at ZERO state.');

    // Create correct products for testing
    await prisma.product.upsert({
        where: { name: 'Basic Plan' },
        update: { price: 779.0 },
        create: {
            name: 'Basic Plan',
            price: 779.0,
            type: 'PERSONAL',
            minutes_allocated: 3650,
            description: 'SINAANK Basic Therapy Kit',
            isActive: true
        }
    });

    await prisma.product.upsert({
        where: { name: 'Business Plan' },
        update: { price: 2900.0 },
        create: {
            name: 'Business Plan',
            price: 2900.0,
            type: 'FAMILY',
            minutes_allocated: 0,
            description: 'SINAANK Business Partner Kit',
            isActive: true
        }
    });

    console.log('Test products (₹779, ₹2900) created/verified.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
