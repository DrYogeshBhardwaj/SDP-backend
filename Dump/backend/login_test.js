const { PrismaClient } = require('@prisma/client');
const { hashPin } = require('./src/utils/hash');
const prisma = new PrismaClient();

async function run() {
    const mobile = '9999999999';
    const pin = '1234';
    console.log("Setting up user 9999999999");

    let user = await prisma.user.findUnique({ where: { mobile } });
    const pin_hash = await hashPin(pin);

    if (user) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { pin_hash, status: 'ACTIVE' }
        });
        console.log("Updated existing test user.");
    } else {
        user = await prisma.user.create({
            data: {
                mobile,
                name: 'Test User',
                pin_hash,
                cid: 'CID_TEST',
                role: 'USER_178',
                status: 'ACTIVE'
            }
        });
        console.log("Created test user.");
    }

    // Now test login API
    console.log("Testing login API locally...");
    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, pin })
        });
        const data = await res.json();
        console.log("Login API status:", res.status);
        console.log("Login API response:", data);
    } catch (e) {
        console.error("Login fetch error:", e.message);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
