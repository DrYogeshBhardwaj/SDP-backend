const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- Verification Test ---');
    try {
        // 1. Fetch a Seeder (Referrer)
        const seeder = await prisma.user.findUnique({ where: { referral_code: 'SDP-TESTPR' } });
        if (!seeder) {
            console.log('Test Seeder not found, skipping test.');
            return;
        }


        // 2. Fetch or Create a Buyer
        const buyer = await prisma.user.findFirst({ where: { mobile: '9999999999' } });
        const buyerId = buyer ? buyer.id : (await prisma.user.create({
            data: {
                mobile: '9999999999',
                pin_hash: '1234',
                cid: 'TEST-BUYER',
                name: 'Test Buyer',
                role: 'BASIC'
            }
        })).id;

        // 3. Purchase a Business Product (₹2900)
        const product = await prisma.product.findFirst({ where: { name: 'Business' } });
        
        console.log(`Simulating purchase of ${product.name} by buyer ${buyerId} via seeder ${seeder.referral_code}`);
        
        // Mock a request context
        const req = { body: { product_id: product.id, referral_code: seeder.referral_code }, user: { id: buyerId, name: 'Test Buyer' } };
        const res = { status: (s) => ({ json: (j) => console.log(`Response ${s}:`, j) }) };

        // Import and run controller function (mocking express)
        const { purchaseProduct } = require('./src/modules/products/product.controller');
        // We'll run it directly
        await purchaseProduct(req, res);

        // 4. Verify Referral Record
        const ref = await prisma.referral.findFirst({ where: { referredUserId: buyerId, level: 1 } });
        console.log('Referral Record Created:', ref ? 'YES' : 'NO');

        // 5. Verify BonusLedger
        const bonus = await prisma.bonusLedger.findFirst({ where: { sourceUserId: buyerId, userId: seeder.id, type: 'DIRECT' } });
        console.log('Bonus Created:', bonus ? `YES (Amount: ${bonus.amount})` : 'NO');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
