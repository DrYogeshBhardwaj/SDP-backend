const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
    console.log('ADMIN_USER:', JSON.stringify(user, null, 2));
    process.exit(0);
}
main();
