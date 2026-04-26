const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("--- STARTING DATA REPAIR: Revenue Backfill ---");
    
    // Find basic users who don't have a REGISTRATION_FEE transaction
    const users = await prisma.user.findMany({
        where: { role: 'BASIC' },
        include: { transactions: { where: { category: 'REGISTRATION_FEE' } } }
    });

    const missingUsers = users.filter(u => u.transactions.length === 0);
    console.log(`Found ${missingUsers.length} users with missing revenue records.`);

    for (const user of missingUsers) {
        console.log(`Loging ₹250 Revenue for ${user.mobile}...`);
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 250,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: 'Historical Revenue Data Fix'
            }
        });
    }

    console.log("--- DATA REPAIR COMPLETE ---");
    await prisma.$disconnect();
}

fix();
