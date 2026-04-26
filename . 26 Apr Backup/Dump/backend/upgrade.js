const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.user.update({
        where: { mobile: '9211755211' },
        data: { role: 'SEEDER' }
    });
    console.log("User updated to SEEDER.");
}
main().finally(() => prisma.$disconnect());
