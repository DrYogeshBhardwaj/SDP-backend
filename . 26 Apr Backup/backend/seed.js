const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    console.log("--- SINAANK V1 DATA RECOVERY START ---");

    // 1. Create Main Partner (Poonam/9211755211)
    const user = await prisma.user.upsert({
        where: { mobile: '9211755211' },
        update: { role: 'PARTNER' },
        create: {
            mobile: '9211755211',
            name: 'Poonam Sinaank',
            role: 'PARTNER',
            referralCode: 'SIN-921175',
            minutesBalance: 3600
        }
    });

    await prisma.wallet.upsert({
        where: { id: user.id + '_CASH' }, // Unique ID for wallet
        update: {},
        create: { userId: user.id, type: 'CASH', balance: 0 }
    });

    // 2. Create Admin
    await prisma.user.upsert({
        where: { mobile: '9999999999' },
        update: { role: 'ADMIN' },
        create: {
            mobile: '9999999999',
            name: 'System Admin',
            role: 'ADMIN',
            referralCode: 'SIN-ADMIN',
            minutesBalance: 999999
        }
    });

    console.log("--- RECOVERY COMPLETE: Users Restored ---");
}

seed().finally(() => prisma.$disconnect());
