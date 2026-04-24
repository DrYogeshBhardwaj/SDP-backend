const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const req = (method, path, body, cookie) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const r = http.request(options, (res) => {
        let data = '';
        const newCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : null;
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                resolve({ body: JSON.parse(data), cookie: newCookie || cookie });
            } catch (e) {
                resolve({ body: data, cookie: newCookie || cookie });
            }
        });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
});

async function runTest() {
    console.log('--- E2E ACTIVATION TEST START ---');
    
    // 0. Cleanup (Correct Order)
    await prisma.userRank.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.bonusLedger.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.walletCash.deleteMany();
    await prisma.walletMinute.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.message.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.systemLog.deleteMany();
    await prisma.systemExpense.deleteMany();
    
    // Break family relations before deleting users
    await prisma.user.updateMany({ data: { familyOwnerId: null } });
    await prisma.user.deleteMany();

    const familyProduct = await prisma.product.findFirst({ where: { type: 'FAMILY' } });
    if (!familyProduct) throw new Error('FAMILY product not found');

    const { hashPin } = require('./src/utils/hash');
    const adminPinHash = await hashPin('1234');

    // Temporarily lower rank for testing
    await prisma.rankConfig.update({
        where: { name: 'Builder' },
        data: { networkRequired: 2 }
    });

    // 1. Setup Admin
    const admin = await prisma.user.create({
        data: {
            mobile: '0000000000',
            name: 'System Admin',
            role: 'ADMIN',
            pin_hash: adminPinHash,
            cid: 'ADMIN_CID',
            status: 'ACTIVE'
        }
    });

    // Login as Admin
    const adminSession = await req('POST', '/api/auth/login', { mobile: '0000000000', pin: '1234' });
    if (!adminSession.cookie) throw new Error('Admin login failed');
    console.log('Admin logged in.');
    
    // 2. Setup Seeder A (The Business ID)
    await req('POST', '/api/auth/register', { mobile: '9000000001', pin: '1111', name: 'Seeder A' });
    let sessionA = await req('POST', '/api/auth/login', { mobile: '9000000001', pin: '1111' });
    await req('POST', '/api/products/purchase', { product_id: familyProduct.id }, sessionA.cookie);
    const activateA = await req('POST', '/api/seeder/activate', { upiId: 'a@upi' }, sessionA.cookie);
    const codeA = activateA.body.data.referral_code;
    console.log(`Seeder A (Code: ${codeA}) created.`);

    // Admin activates Seeder A (Business rights)
    await req('POST', '/api/admin/users/activate-kit', { userId: sessionA.body.data.user.id }, adminSession.cookie);
    console.log('Seeder A activated by Admin.');

    // 3. User B registers under Seeder A
    await req('POST', '/api/auth/register', { mobile: '9000000002', pin: '2222', name: 'User B', referral_code: codeA });
    let sessionB = await req('POST', '/api/auth/login', { mobile: '9000000002', pin: '2222' });
    // User B purchases FAMILY pack
    await req('POST', '/api/products/purchase', { product_id: familyProduct.id }, sessionB.cookie);
    console.log('User B purchased under Seeder A (PENDING).');

    // Verify No Bonus yet
    const walletA_pending = await prisma.walletCash.findFirst({ where: { userId: sessionA.body.data.user.id } });
    const referralB_pending = await prisma.referral.findFirst({ where: { referredUserId: sessionB.body.data.user.id } });
    console.log(`Initial Checks: Wallet A Balance: ${walletA_pending?.balance || 0}, Referral B Status: ${referralB_pending?.status}`);

    if ((walletA_pending?.balance || 0) !== 0) { console.error('FAIL: Bonus awarded before activation!'); }

    // 4. Admin activates User B
    console.log('Activating User B...');
    const activationB = await req('POST', '/api/admin/users/activate-kit', { userId: sessionB.body.data.user.id }, adminSession.cookie);
    console.log('Activation Response B:', activationB.body);

    if (activationB.body.success === false) {
        console.error('FAIL: User B activation failed:', activationB.body.message);
        process.exit(1);
    }

    // Verify Bonus awarded to A
    const walletA_active = await prisma.walletCash.findFirst({ where: { userId: sessionA.body.data.user.id } });
    console.log(`Post-Activation A: Wallet Balance: ${walletA_active?.balance}`);

    if (walletA_active?.balance !== 220) { console.error('FAIL: Level 1 bonus not awarded correctly!'); }

    // 5. User B becomes Seeder (Business ID)
    await req('POST', '/api/seeder/activate', { upiId: 'b@upi' }, sessionB.cookie);
    const codeB = (await prisma.user.findUnique({ where: { mobile: '9000000002' } })).referral_code;

    // 6. User C registers under User B (Leads to Level 2 for A)
    await req('POST', '/api/auth/register', { mobile: '9000000003', pin: '3333', name: 'User C', referral_code: codeB });
    let sessionC = await req('POST', '/api/auth/login', { mobile: '9000000003', pin: '3333' });
    await req('POST', '/api/products/purchase', { product_id: familyProduct.id }, sessionC.cookie);
    console.log('User C purchased under User B (PENDING).');

    // Activate User C
    await req('POST', '/api/admin/users/activate-kit', { userId: sessionC.body.data.user.id }, adminSession.cookie);
    console.log('User C activated.');

    // Final Wallet Checks
    const finalA = await prisma.walletCash.findFirst({ where: { userId: sessionA.body.data.user.id } });
    const finalB = await prisma.walletCash.findFirst({ where: { userId: sessionB.body.data.user.id } });
    console.log('--- FINAL BALANCES ---');
    console.log('User A (Grandparent):', finalA?.balance, '(Expected: 220 + 150 + 300 = 670)');
    console.log('User B (Parent):', finalB?.balance, '(Expected: 220)');

    if (finalA?.balance === 670 && finalB?.balance === 220) {
        console.log('SUCCESS: Referral and Rank Payout Rules Verified!');
    } else {
        console.error('FAIL: Payouts do not match expected values.');
    }

    await prisma.$disconnect();
}

runTest().catch(console.error);
