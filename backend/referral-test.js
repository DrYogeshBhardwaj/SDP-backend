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
        res.on('end', () => resolve({ body: JSON.parse(data), cookie: newCookie || cookie }));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
});

async function runTest() {
    await prisma.transaction.deleteMany();
    await prisma.bonusLedger.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.walletCash.deleteMany();
    await prisma.walletMinute.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.user.deleteMany(); // clear users for clean test

    const familyProduct = await prisma.product.findFirst({ where: { type: 'FAMILY' } });

    // User A
    await req('POST', '/api/auth/register', { mobile: '9000000001', pin: '1111', name: 'User A' });
    let userA = await req('POST', '/api/auth/login', { mobile: '9000000001', pin: '1111' });
    let pA = await req('POST', '/api/products/purchase', { product_id: familyProduct.id }, userA.cookie);
    console.log('Purchase A:', pA.body);
    const seederA = await req('POST', '/api/seeder/activate', {}, userA.cookie);
    const codeA = seederA.body.data.referral_code;
    console.log(`User A (Code: ${codeA}) Activated SEEDER`);

    // User B (Referred by A)
    await req('POST', '/api/auth/register', { mobile: '9000000002', pin: '2222', name: 'User B' });
    let userB = await req('POST', '/api/auth/login', { mobile: '9000000002', pin: '2222' });
    let pB = await req('POST', '/api/products/purchase', { product_id: familyProduct.id, referral_code: codeA }, userB.cookie);
    console.log('Purchase B:', pB.body);
    const seederB = await req('POST', '/api/seeder/activate', {}, userB.cookie);
    const codeB = seederB.body.data?.referral_code;
    console.log(`User B (Code: ${codeB}) Purchased using ${codeA} & Activated SEEDER`);

    // User C (Referred by B)
    await req('POST', '/api/auth/register', { mobile: '9000000003', pin: '3333', name: 'User C' });
    let userC = await req('POST', '/api/auth/login', { mobile: '9000000003', pin: '3333' });
    console.log('User C Login:', userC.body);
    let pC = await req('POST', '/api/products/purchase', { product_id: familyProduct.id, referral_code: codeB }, userC.cookie);
    console.log('Purchase C:', pC.body);
    console.log(`User C Purchased using ${codeB}`);

    // Checks
    const cashBalA = await prisma.walletCash.findFirst({ where: { user: { mobile: '9000000001' } } });
    const cashBalB = await prisma.walletCash.findFirst({ where: { user: { mobile: '9000000002' } } });
    const cashBalC = await prisma.walletCash.findFirst({ where: { user: { mobile: '9000000003' } } });

    const bonusesA = await prisma.bonusLedger.findMany({ where: { user: { mobile: '9000000001' } } });
    const bonusesB = await prisma.bonusLedger.findMany({ where: { user: { mobile: '9000000002' } } });

    console.log('--- RESULTS ---');
    console.log('User A Cash:', cashBalA?.balance);
    console.log('User A Bonuses:', bonusesA.map(b => `${b.type}: ${b.amount}`));
    console.log('User B Cash:', cashBalB?.balance);
    console.log('User B Bonuses:', bonusesB.map(b => `${b.type}: ${b.amount}`));
    console.log('User C Cash:', cashBalC?.balance);

    await prisma.$disconnect();
}

runTest().catch(console.error);
