const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('./src/utils/jwt');

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
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
});

async function runTest() {
    const mobile = '9315859557';
    const user = await prisma.user.findUnique({ where: { mobile } });

    // Simulate Login token
    const token = generateToken({
        userId: user.id,
        role: user.role,
        cid: user.cid
    });
    const cookie = `jwt=${token}`;

    const familyProduct = await prisma.product.findFirst({ where: { type: 'FAMILY' } });

    console.log("Attempting Purchase with Self-Referral...");
    let purchaseAttempt = await req('POST', '/api/products/purchase', {
        product_id: familyProduct.id,
        referral_code: 'SDP-M517H7'
    }, cookie);

    console.log('Purchase Attempt Result:', purchaseAttempt);

    await prisma.$disconnect();
}

runTest().catch(console.error);
