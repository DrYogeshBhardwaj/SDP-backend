const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mobile = '9211755211';
    try {
        const user = await prisma.user.update({
            where: { mobile },
            data: {
                kit_activated: false,
                pincode: null,
                city: null,
                state: null
            }
        });
        console.log(`User ${mobile} reset successfully. Ready for testing.`);
    } catch (e) {
        console.error(`Error resetting user: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
