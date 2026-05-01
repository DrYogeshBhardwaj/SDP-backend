const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { mobile: '8851168290' },
    include: { sponsor: true }
  });
  
  if (user) {
    console.log(`User: ${user.mobile} (ID: ${user.id})`);
    if (user.sponsor) {
      console.log(`Sponsor: ${user.sponsor.mobile} (ID: ${user.sponsor.id})`);
    } else {
      console.log('Sponsor: NONE');
    }
  } else {
    console.log('User 8851168290 not found');
  }
  
  const admin = await prisma.user.findUnique({
    where: { mobile: '9211755211' }
  });
  if (admin) {
    console.log(`Admin (Potential Sponsor): ${admin.mobile} (ID: ${admin.id})`);
  } else {
    console.log('Admin 9211755211 not found');
  }

  process.exit(0);
}

check();
