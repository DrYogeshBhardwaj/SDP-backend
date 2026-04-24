const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({ where: { mobile: { contains: '9211755211' } } });
    console.log("User by contains:", user);
    
    // Let's also retrieve ALL users to be sure
    const allUsers = await prisma.user.findMany({ select: { mobile: true, name: true }});
    console.log("Total users in DB:", allUsers.length);
    console.log(allUsers);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
