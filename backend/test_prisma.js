const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const c = await prisma.user.count();
        console.log("User count:", c);
    } catch (e) {
        console.error("Prisma error:", e);
    }
}
main();
