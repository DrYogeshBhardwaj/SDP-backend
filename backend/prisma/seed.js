const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding products...');

    // Product 1: SDP Personal
    await prisma.product.upsert({
        where: { name: 'SDP Personal' }, // Assumes we might add unique to name later, but for now just seed it safely
        update: {},
        create: {
            name: 'SDP Personal',
            price: 178,
            type: 'PERSONAL',
            minutes_allocated: 3650,
            description: 'Personal plan with 3650 minutes.',
            isActive: true
        }
    });

    // Product 2: SDP Family
    await prisma.product.upsert({
        where: { name: 'SDP Family' },
        update: {},
        create: {
            name: 'SDP Family',
            price: 580,
            type: 'FAMILY',
            minutes_allocated: 3650,
            description: 'Family plan with 3650 minutes and additional features.',
            isActive: true
        }
    });

    console.log('Products seeded successfully.');

    console.log('Seeding ranks...');
    const ranks = [
        { name: 'Seeder', directRequired: 0, networkRequired: 0, bonusAmount: 0 },
        { name: 'Builder', directRequired: 10, networkRequired: 0, bonusAmount: 300 },
        { name: 'Partner', directRequired: 0, networkRequired: 50, bonusAmount: 1000 },
        { name: 'Senior Partner', directRequired: 0, networkRequired: 100, bonusAmount: 2500 },
        { name: 'Elite Partner', directRequired: 0, networkRequired: 200, bonusAmount: 5000 }
    ];

    for (const rank of ranks) {
        await prisma.rankConfig.upsert({
            where: { name: rank.name },
            update: rank,
            create: rank
        });
    }
    console.log('Ranks seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
