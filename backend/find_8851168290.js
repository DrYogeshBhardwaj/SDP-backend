const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { mobile: '8851168290' } });
    console.log(user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
