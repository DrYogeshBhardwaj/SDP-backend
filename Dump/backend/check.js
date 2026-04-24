const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log("Checking DB...");
    const u = await prisma.user.findFirst({ where: { mobile: '9211755211' } });
    console.log(JSON.stringify(u, null, 2));
}
main().finally(() => prisma.$disconnect());
