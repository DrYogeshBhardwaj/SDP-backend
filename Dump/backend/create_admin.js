const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function createAdmin() {
    const mobile = '9999999999';
    const pin = '1234';
    const saltRounds = 10;
    const pin_hash = await bcrypt.hash(pin, saltRounds);

    try {
        const user = await prisma.user.upsert({
            where: { mobile },
            update: {
                role: 'ADMIN',
                pin_hash,
                status: 'ACTIVE'
            },
            create: {
                mobile,
                name: 'System Admin',
                cid: 'CID_ADMIN_' + Date.now(),
                pin_hash,
                role: 'ADMIN',
                status: 'ACTIVE',
                kit_activated: true,
                referral_code: 'SDP-ADMIN',
                plan_type: 'BUSINESS'
            }
        });

        // Ensure wallets exist
        await prisma.walletCash.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id }
        });
        await prisma.walletMinute.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, balance: 3650 }
        });

        console.log(`Admin user ${mobile} created/updated successfully with PIN 1234`);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
