const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  const mobile = '9211755211';
  console.log(`Starting deletion for ${mobile}...`);

  try {
    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) {
      console.log('User not found.');
      return;
    }

    const userId = user.id;

    // Delete dependent records manually if needed
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: userId }, { referredUserId: userId }] } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.walletCash.deleteMany({ where: { userId } });
    await prisma.walletMinute.deleteMany({ where: { userId } });
    await prisma.therapySession.deleteMany({ where: { userId } });
    
    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    console.log(`Successfully deleted user ${mobile} and all related records.`);
  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
