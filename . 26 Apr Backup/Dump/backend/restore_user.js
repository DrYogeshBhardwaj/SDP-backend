const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function restoreUser() {
    const mobile = '9211755211';
    const pin = '1234';
    const pin_hash = await bcrypt.hash(pin, 10);

    try {
        await prisma.user.upsert({
            where: { mobile },
            update: {},
            create: {
                mobile,
                name: 'Main User',
                cid: 'CID_USER_' + Date.now(),
                pin_hash,
                role: 'BASIC',
                status: 'ACTIVE',
                referral_code: 'REF-' + mobile,
                v1_minutes_balance: 3600
            }
        });
        console.log(`User ${mobile} restored successfully.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
restoreUser();
