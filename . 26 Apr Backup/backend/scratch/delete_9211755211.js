const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
    const mobile = '9211755211';
    try {
        const user = await prisma.user.findUnique({ where: { mobile } });
        if (user) {
            await prisma.transaction.deleteMany({ where: { userId: user.id } });
            await prisma.wallet.deleteMany({ where: { userId: user.id } });
            await prisma.user.delete({ where: { id: user.id } });
            console.log(`Successfully deleted ${mobile}`);
        } else {
            console.log(`User ${mobile} not found.`);
        }
    } catch (err) {
        console.error("Deletion failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

deleteUser();
