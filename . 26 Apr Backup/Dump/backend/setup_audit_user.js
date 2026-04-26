const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin } = require('./src/utils/hash');

async function setup() {
    const mobile = '8888877777';
    const pin = '1234';
    const pin_hash = await hashPin(pin);

    // Cleanup existing
    await prisma.user.deleteMany({ where: { mobile } });

    // Create User
    const user = await prisma.user.create({
        data: {
            mobile,
            cid: mobile,
            name: 'Audit User',
            pin_hash,
            role: 'BASIC',
            plan_type: 'BASIC',
            status: 'ACTIVE',
            minutes: {
                create: { balance: 10 }
            }
        }
    });

    console.log(`✅ Test User Created: ${mobile} / ${pin}`);
}

setup().then(() => process.exit(0));
