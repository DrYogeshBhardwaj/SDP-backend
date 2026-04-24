const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { referral_code: 'SDP-M517H7' },
        include: { referredBy: true }
    });
    console.log(user);
    await prisma.$disconnect();
}

main().catch(console.error);
