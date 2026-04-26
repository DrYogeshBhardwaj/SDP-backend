const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
    console.log("--- STARTING FINANCIAL RE-SYNC BASED ON TREE HIERARCHY ---");
    
    // 1. Purge problematic logs
    await prisma.transaction.deleteMany({
        where: { category: { in: ['BONUS', 'REGISTRATION_FEE', 'PAYOUT_REQUEST'] } }
    });
    
    // Reset all CASH Wallets
    await prisma.wallet.updateMany({
        where: { type: 'CASH' },
        data: { balance: 0 }
    });

    // 2. Fetch all users
    const users = await prisma.user.findMany({
        where: { role: 'BASIC' },
        orderBy: { createdAt: 'asc' } // Process in order of joining
    });

    for (const user of users) {
        console.log(`Processing ${user.mobile}...`);
        
        // Log Revenue
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 250,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: 'System Re-sync: Registration Revenue'
            }
        });

        // Resolve Sponsor
        if (user.sponsorId) {
            // Level 1: ₹100
            await prisma.wallet.updateMany({
                where: { userId: user.sponsorId, type: 'CASH' },
                data: { balance: { increment: 100 } }
            });
            await prisma.transaction.create({
                data: {
                    userId: user.sponsorId,
                    amount: 100,
                    type: 'CREDIT',
                    category: 'BONUS',
                    description: `Direct Comm from ${user.mobile}`
                }
            });

            // Level 2: ₹80
            const sponsor = await prisma.user.findUnique({ where: { id: user.sponsorId } });
            if (sponsor && sponsor.sponsorId) {
                await prisma.wallet.updateMany({
                    where: { userId: sponsor.sponsorId, type: 'CASH' },
                    data: { balance: { increment: 80 } }
                });
                await prisma.transaction.create({
                    data: {
                        userId: sponsor.sponsorId,
                        amount: 80,
                        type: 'CREDIT',
                        category: 'BONUS',
                        description: `Team Comm from ${user.mobile}`
                    }
                });
            }
        }
    }

    console.log("--- FINANCIAL RE-SYNC COMPLETE ---");
    await prisma.$disconnect();
}

sync();
