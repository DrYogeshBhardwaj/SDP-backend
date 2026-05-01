const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { mobile: true, id: true }
  });
  console.log('All users in DB:');
  users.forEach(u => console.log(` - ${u.mobile}`));
  process.exit(0);
}

check();
