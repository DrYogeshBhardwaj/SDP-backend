const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote() {
    try {
        const user = await prisma.user.update({
            where: { mobile: '9211755211' },
            data: { role: 'ADMIN' }
        });
        console.log(`Success: ${user.mobile} is now a Super ADMIN.`);
    } catch (err) {
        console.error("Promotion failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

promote();
