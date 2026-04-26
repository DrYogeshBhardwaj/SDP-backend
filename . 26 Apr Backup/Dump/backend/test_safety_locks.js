const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- Testing Final Safety Locks ---');

    const mobile = '7777777777';
    await prisma.user.deleteMany({ where: { mobile } });

    // 1. Create User with Expired Subscription
    const expiredUser = await prisma.user.create({
        data: {
            mobile,
            pin_hash: 'dummy',
            cid: 'CID_SAFETY_EXPIRED',
            role: 'USER_178',
            validity_expiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
            minutes: { create: { balance: 3650 } }
        }
    });

    console.log('\nCase 1: Expired Subscription');
    // Simulate minutes.controller.js logic
    try {
        const u = await prisma.user.findUnique({
            where: { id: expiredUser.id },
            select: { validity_expiry: true, minutes: true }
        });
        if (u.validity_expiry && new Date(u.validity_expiry) < new Date()) {
            console.log('✅ Blocked: Your SDP Access Expired');
        } else {
            console.log('❌ Failed to block expired user');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 2. Create User with Zero Balance
    const zeroUserMobile = '6666666666';
    await prisma.user.deleteMany({ where: { mobile: zeroUserMobile } });
    const zeroUser = await prisma.user.create({
        data: {
            mobile: zeroUserMobile,
            pin_hash: 'dummy',
            cid: 'CID_SAFETY_ZERO',
            role: 'USER_178',
            validity_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            minutes: { create: { balance: 0 } }
        }
    });

    console.log('\nCase 2: Zero Balance');
    try {
        const u = await prisma.user.findUnique({
            where: { id: zeroUser.id },
            select: { validity_expiry: true, minutes: true }
        });
        const duration = 2;
        const wallet = u.minutes;
        if (!wallet || wallet.balance < duration) {
            console.log('✅ Blocked: Insufficient minutes balance');
        } else {
            console.log('❌ Failed to block zero balance user');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 3. Test Expiry Warning (7 days)
    console.log('\nCase 3: Expiry Warning');
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 5); // 5 days from now
    
    const diff = warningDate - new Date();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const expiryWarning = daysRemaining <= 7 && daysRemaining > 0;
    
    console.log(`- Days Remaining: ${daysRemaining}`);
    console.log(`- Expiry Warning: ${expiryWarning}`);
    if (expiryWarning === true && daysRemaining === 5) {
        console.log('✅ Warning correctly triggered for 5 days.');
    } else {
        console.log('❌ Warning logic failed.');
    }

    await prisma.$disconnect();
}

test().catch(console.error);
