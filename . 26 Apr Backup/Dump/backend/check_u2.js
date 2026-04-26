const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const u2 = await prisma.user.findUnique({ where: { mobile: '7777777777' } });
        if (u2) {
            console.log("USER-2 STATE:", {
                id: u2.id,
                mobile: u2.mobile,
                status: u2.status,
                kit_activated: u2.kit_activated,
                referral_code: u2.referral_code
            });
        } else {
            console.log("USER-2 NOT FOUND");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
