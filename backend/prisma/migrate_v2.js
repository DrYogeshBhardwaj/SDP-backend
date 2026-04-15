const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('--- Starting Migration V2 ---');

    try {
        // 1. Migrate Legacy Users
        const usersToUpdate = await prisma.user.findMany({
            where: {
                role: { in: ['USER_178', 'USER_580'] }
            }
        });
        console.log(`Found ${usersToUpdate.length} legacy users to convert to BASIC.`);

        for (const user of usersToUpdate) {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'BASIC' }
            });
        }
        console.log('Legacy user roles updated.');

        // 2. Clear Old Products & Create New Ones
        await prisma.product.deleteMany({});
        const products = [
            {
                name: 'Basic',
                price: 779,
                type: 'PERSONAL',
                minutes_allocated: 365, // Example
                description: 'Basic SINAANK Mobile Therapy Plan'
            },
            {
                name: 'Business',
                price: 2900,
                type: 'FAMILY',
                minutes_allocated: 1540,
                description: 'Business SINAANK Mobile Therapy Plan'
            },
            {
                name: 'Upgrade',
                price: 2121,
                type: 'FAMILY',
                minutes_allocated: 1540,
                description: 'Upgrade to Business SINAANK Mobile Therapy Plan'
            }
        ];

        for (const p of products) {
            await prisma.product.create({ data: p });
        }
        console.log('New products (Basic, Business, Upgrade) created.');

        // 3. Update RankConfig
        await prisma.rankConfig.deleteMany({});
        const rankRewards = [
            { name: 'Bronze', points: 25, basic: 200, business: 500 },
            { name: 'Silver', points: 100, basic: 700, business: 2000 },
            { name: 'Gold', points: 300, basic: 2000, business: 6000 },
            { name: 'Diamond', points: 1000, basic: 7000, business: 21000 },
            { name: 'Crown', points: 3000, basic: 20000, business: 51000 }
        ];

        for (const r of rankRewards) {
            await prisma.rankConfig.create({
                data: {
                    name: r.name,
                    pointsRequired: r.points,
                    basicBonus: r.basic,
                    businessBonus: r.business,
                    directRequired: 0, // Legacy fields
                    networkRequired: 0,
                    bonusAmount: 0
                }
            });
        }
        console.log('Point-based Rank rewards initialized.');

        console.log('--- Migration V2 Completed Successfully ---');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
