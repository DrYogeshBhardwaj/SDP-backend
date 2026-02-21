const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPurchase() {
    const product = await prisma.product.findFirst({ where: { type: 'FAMILY' } });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
        res.on('data', () => { });
        res.on('end', () => {
            const cookie = res.headers['set-cookie'][0].split(';')[0];

            const purReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/products/purchase',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
            }, (purRes) => {
                let pData = '';
                purRes.on('data', c => pData += c);
                purRes.on('end', () => {
                    console.log('Purchase:', pData);
                    prisma.$disconnect();
                });
            });
            purReq.write(JSON.stringify({ product_id: product.id }));
            purReq.end();
        });
    });

    req.write(JSON.stringify({ mobile: '9876543210', pin: '1234' }));
    req.end();
}

testPurchase();
