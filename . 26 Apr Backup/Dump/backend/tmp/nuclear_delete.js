const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nuclearDelete() {
  const mobile = '9211755211';
  console.log(`Searching for user with mobile: ${mobile}`);

  try {
    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) {
      console.log('User not found in database. Nothing to delete.');
      return;
    }

    const userId = user.id;
    console.log(`Found user ID: ${userId}. Deleting relations...`);

    // Delete everything that could block user deletion
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.therapySession.deleteMany({ where: { userId } });
    await prisma.walletCash.deleteMany({ where: { userId } });
    await prisma.walletMinute.deleteMany({ where: { userId } });
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: userId }, { referredUserId: userId }] } });
    await prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
    await prisma.bonusLedger.deleteMany({ where: { OR: [{ userId }, { sourceUserId: userId }] } });
    await prisma.systemLog.deleteMany({ where: { OR: [{ adminId: userId }, { targetUserId: userId }] } });
    await prisma.sidHistory.deleteMany({ where: { userId } });
    await prisma.userRank.deleteMany({ where: { userId } });

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    console.log(`SUCCESS: User ${mobile} and all associated data deleted.`);
  } catch (err) {
    console.error('DELETION FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

nuclearDelete();
