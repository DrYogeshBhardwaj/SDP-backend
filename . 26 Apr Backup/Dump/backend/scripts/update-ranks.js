const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRanks() {
    console.log('Updating Rank Configurations...');

    // Deactivate all existing ranks first
    await prisma.rankConfig.updateMany({
        data: { active: false }
    });

    const newRanks = [
        { name: 'Builder', directRequired: 0, networkRequired: 25, bonusAmount: 300, active: true },
        { name: 'Leader', directRequired: 0, networkRequired: 100, bonusAmount: 1000, active: true },
        { name: 'Master', directRequired: 0, networkRequired: 500, bonusAmount: 5000, active: true },
        { name: 'Champion', directRequired: 0, networkRequired: 2000, bonusAmount: 21000, active: true }
    ];

    for (const rank of newRanks) {
        await prisma.rankConfig.upsert({
            where: { name: rank.name },
            update: rank,
            create: rank
        });
        console.log(`Upserted Rank: ${rank.name}`);
    }

    console.log('Rank Update Complete.');
    await prisma.$disconnect();
}

updateRanks().catch(err => {
    console.error(err);
    process.exit(1);
});
