const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteAdmin(mobile) {
    console.log(`--- PROMOTING ${mobile} TO ADMIN ---`);
    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) {
        console.log("User not found!");
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
    });

    console.log(`✅ ${mobile} is now an ADMIN.`);
}

const target = process.argv[2] || '9211755211';
promoteAdmin(target).finally(() => prisma.$disconnect());
