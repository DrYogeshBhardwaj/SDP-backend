const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function createFirstAdmin() {
    // EDIT THESE VALUES FOR PRODUCTION
    const adminMobile = '9999999999'; // Replace with real admin mobile
    const adminName = 'SINAANK Root Admin';
    const adminPin = '1234'; // Replace with a secure 4-digit PIN

    console.log('--- SINAANK FIRST ADMIN CREATION ---');

    try {
        const salt = await bcrypt.genSalt(10);
        const pin_hash = await bcrypt.hash(adminPin, salt);
        const cid = `ADMIN_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const admin = await prisma.user.create({
            data: {
                mobile: adminMobile,
                name: adminName,
                pin_hash: pin_hash,
                cid: cid,
                role: 'ADMIN',
                status: 'ACTIVE',
                validity_expiry: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000), // 10 years
                kit_activated: true,
                cash: { create: {} },
                minutes: { create: { balance: 999999 } }
            }
        });

        console.log(`\n✅ First Admin Created Successfully!`);
        console.log(`- Mobile: ${admin.mobile}`);
        console.log(`- CID: ${admin.cid}`);
        console.log(`- Role: ${admin.role}`);
        console.log(`- Status: ${admin.status}`);
        console.log('\nThis user is now the ROOT of the SINAANK production system.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Admin Creation Failed:', error.message);
        process.exit(1);
    }
}

createFirstAdmin();
