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
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
