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
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data), cookie: newCookie || cookie }));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
});

async function runTest() {
    const mobile = '9315859557';
    // first see if user exists, if not, create
    const existUser = await prisma.user.findUnique({ where: { mobile } });

    // Login
    let loginData = await req('POST', '/api/auth/login', { mobile, pin: '1234' });
    let cookie = loginData.cookie;

    // Attempt standard purchase with self-referring code if we know the user
    // However, we just know referral_code is 'SDP-M517H7'
    const familyProduct = await prisma.product.findFirst({ where: { type: 'FAMILY' } });

    console.log("Attempting Purchase with Self-Referral...");
    let purchaseAttemp = await req('POST', '/api/products/purchase', {
        product_id: familyProduct.id,
        referral_code: 'SDP-M517H7'
    }, cookie);

    console.log('Purchase Attempt Result:', purchaseAttemp.body);

    await prisma.$disconnect();
}

runTest().catch(console.error);
