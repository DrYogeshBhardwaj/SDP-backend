const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const rand = Date.now().toString();
        await prisma.user.create({
            data: {
                mobile: rand,
                cid: rand,
                pin_hash: 'abc',
                role: 'BASIC',
                status: 'PENDING'
            }
        });
        console.log("TEST SUCCESSFUL! NO PRISMA SCHEMA MISMATCH.");
    } catch (e) {
        console.error("PRISMA CRASHED! EXACT ERROR MESSAGE:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
