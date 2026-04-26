const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding products...');

    // Product 1: Basic Plan
    await prisma.product.upsert({
        where: { name: 'Basic Plan' },
        update: { price: 779, minutes_allocated: 3650 },
        create: {
            name: 'Basic Plan',
            price: 779,
            type: 'PERSONAL',
            minutes_allocated: 3650,
            description: 'SINAANK Basic Plan with 3650 minutes.',
            isActive: true
        }
    });

    // Product 2: Business Plan
    await prisma.product.upsert({
        where: { name: 'Business Plan' },
        update: { price: 2990, minutes_allocated: 3650 },
        create: {
            name: 'Business Plan',
            price: 2990,
            type: 'FAMILY',
            minutes_allocated: 3650,
            description: 'SINAANK Business Plan with 3650 minutes and 3 family slots.',
            isActive: true
        }
    });

    // Product 3: Upgrade to Business
    await prisma.product.upsert({
        where: { name: 'Upgrade to Business' },
        update: { price: 2211, minutes_allocated: 0 },
        create: {
            name: 'Upgrade to Business',
            price: 2211,
            type: 'FAMILY',
            minutes_allocated: 0,
            description: 'Upgrade from Basic to Business Plan.',
            isActive: true
        }
    });

    console.log('Products seeded successfully.');

    console.log('Seeding ranks...');
    const ranks = [
        { name: 'Silver Partner', directRequired: 0, networkRequired: 25, bonusAmount: 500, pointsRequired: 25 },
        { name: 'Gold Partner', directRequired: 0, networkRequired: 50, bonusAmount: 1200, pointsRequired: 50 },
        { name: 'Platinum Partner', directRequired: 0, networkRequired: 100, bonusAmount: 3000, pointsRequired: 100 },
        { name: 'Diamond Partner', directRequired: 0, networkRequired: 250, bonusAmount: 8000, pointsRequired: 250 },
        { name: 'Crown Partner', directRequired: 0, networkRequired: 500, bonusAmount: 20000, pointsRequired: 500 }
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
            status: 'ACTIVE',
            kit_activated: true,
            referral_code: 'SDP-ADMIN',
            plan_type: 'BUSINESS'
        },
        {
            mobile: '8888888888',
            name: 'Master Partner',
            role: 'BUSINESS',
            cid: 'CID_MASTER',
            pin_hash,
            status: 'ACTIVE',
            kit_activated: true,
            referral_code: 'SDP-MASTER',
            plan_type: 'BUSINESS'
        },
        {
            mobile: '7777777777',
            name: 'Direct Partner',
            role: 'BASIC',
            cid: 'CID_PARTNER',
            pin_hash,
            status: 'ACTIVE',
            kit_activated: true,
            referral_code: 'SDP-PARTNER',
            plan_type: 'BASIC'
        }
    ];

    console.log('Seeding hierarchy...');
    const admin = await prisma.user.upsert({
        where: { mobile: testUsers[0].mobile },
        update: testUsers[0],
        create: {
            ...testUsers[0],
            cash: { create: {} },
            minutes: { create: { balance: 3650 } }
        }
    });

    const master = await prisma.user.upsert({
        where: { mobile: testUsers[1].mobile },
        update: { 
            ...testUsers[1], 
            sponsor_id: admin.id,
            level1_id: admin.id 
        },
        create: {
            ...testUsers[1],
            sponsor_id: admin.id,
            level1_id: admin.id,
            cash: { create: {} },
            minutes: { create: { balance: 3650 } }
        }
    });

    const partner = await prisma.user.upsert({
        where: { mobile: testUsers[2].mobile },
        update: { 
            ...testUsers[2], 
            sponsor_id: master.id,
            level1_id: master.id,
            level2_id: admin.id
        },
        create: {
            ...testUsers[2],
            sponsor_id: master.id,
            level1_id: master.id,
            level2_id: admin.id,
            cash: { create: {} },
            minutes: { create: { balance: 3650 } }
        }
    });

    console.log('Hierarchy seeded: Admin <- Master <- Partner');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
