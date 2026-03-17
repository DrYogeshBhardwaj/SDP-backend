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
        { name: 'Silver Partner', directRequired: 0, networkRequired: 25, bonusAmount: 500 },
        { name: 'Gold Partner', directRequired: 0, networkRequired: 50, bonusAmount: 1200 },
        { name: 'Platinum Partner', directRequired: 0, networkRequired: 100, bonusAmount: 3000 },
        { name: 'Diamond Partner', directRequired: 0, networkRequired: 250, bonusAmount: 8000 },
        { name: 'Crown Partner', directRequired: 0, networkRequired: 500, bonusAmount: 20000 }
    ];

    for (const rank of ranks) {
        await prisma.rankConfig.upsert({
            where: { name: rank.name },
            update: rank,
            create: rank
        });
    }
    console.log('Ranks seeded successfully.');

    console.log('Seeding initial users...');
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const pin_hash = await bcrypt.hash('1234', salt);

    const testUsers = [
        {
            mobile: '9999999999',
            name: 'System Admin',
            role: 'ADMIN',
            cid: 'CID_ADMIN123',
            pin_hash,
            status: 'ACTIVE'
        },
        {
            mobile: '9625645211',
            name: 'Test Seeder',
            role: 'SEEDER',
            cid: 'CID_TESTSD',
            pin_hash,
            status: 'ACTIVE'
        },
        {
            mobile: '9211755211',
            name: 'Test Buyer',
            role: 'USER_178',
            cid: 'CID_TESTBY',
            pin_hash,
            status: 'ACTIVE'
        }
    ];

    for (const user of testUsers) {
        await prisma.user.upsert({
            where: { mobile: user.mobile },
            update: {},
            create: {
                ...user,
                cash: { create: { balance: user.role === 'ADMIN' ? 0 : 500 } },
                minutes: { create: { balance: 3650 } }
            }
        });
    }

    console.log('Initial Test Users seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
