const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
    try {
        const mobile = '9211755211';
        const user = await prisma.user.findUnique({ where: { mobile } });

        if (user) {
            // Delete dependent records
            await prisma.walletMinute.deleteMany({ where: { userId: user.id } });
            await prisma.walletCash.deleteMany({ where: { userId: user.id } });
            await prisma.transaction.deleteMany({ where: { userId: user.id } });
            await prisma.payout.deleteMany({ where: { userId: user.id } });
            await prisma.referral.deleteMany({ where: { OR: [{ referrerId: user.id }, { referredUserId: user.id }] } });
            await prisma.bonusLedger.deleteMany({ where: { OR: [{ userId: user.id }, { sourceUserId: user.id }] } });
            await prisma.userRank.deleteMany({ where: { userId: user.id } });
            await prisma.message.deleteMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } });

            // Delete user
            await prisma.user.delete({ where: { id: user.id } });
            console.log(`✅ User ${mobile} successfully removed from the database!`);
        } else {
            console.log(`User ${mobile} was not found in the database. (Already deleted)`);
        }
    } catch (e) {
        console.error("Error deleting user:", e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteUser();
