const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating RankConfig table with new Team Growth Bonus milestones...');
    
    // The new ranks based on Team count (L1 + L2, which is networkRequired)
    const newRanks = [
        { name: 'Silver Partner', directRequired: 0, networkRequired: 25, bonusAmount: 500 },
        { name: 'Gold Partner', directRequired: 0, networkRequired: 50, bonusAmount: 1200 },
        { name: 'Platinum Partner', directRequired: 0, networkRequired: 100, bonusAmount: 3000 },
        { name: 'Diamond Partner', directRequired: 0, networkRequired: 250, bonusAmount: 8000 },
        { name: 'Crown Partner', directRequired: 0, networkRequired: 500, bonusAmount: 20000 }
    ];

    // Clear existing ranks (we might need to handle foreign-key constraints if UserRank exists, 
    // but assuming for this test/dev environment it's fine. If foreign keys exist, we update instead.)
    
    for (const rank of newRanks) {
        // Upsert by name, or if we changed names, just insert what's missing.
        // Let's rely on standard upsert adding new ranks. 
        // We will just add these new ranks. The old ones (Builder, Partner, etc) 
        // can be deactivated or left alone, but let's deactivate all old ranks first for cleanliness.
        
        await prisma.rankConfig.updateMany({
            data: { active: false }
        });
        
        console.log(`Setting up rank: ${rank.name} for team size ${rank.networkRequired}`);
        
        const existing = await prisma.rankConfig.findFirst({
            where: { networkRequired: rank.networkRequired }
        });
        
        if (existing) {
             await prisma.rankConfig.update({
                 where: { id: existing.id },
                 data: { ...rank, active: true }
             });
        } else {
             await prisma.rankConfig.create({
                 data: { ...rank, active: true }
             });
        }
    }
    
    console.log('Update complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
