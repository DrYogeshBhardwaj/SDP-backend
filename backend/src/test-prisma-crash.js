const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.user.create({
            data: {
                mobile: "9999999999",
                cid: "9999999999",
                pin_hash: "abc",
                role: "BASIC",
                status: "PENDING"
            }
        });
        console.log("SUCCESS!");
    } catch (e) {
        console.error("CRASH EXACT REASON:", e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
