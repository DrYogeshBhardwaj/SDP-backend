const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const testMobiles = ['4444444444', '3333333333', '2222222222', '5555555555', '8888888888', '7777777777', '6666666666'];

async function cleanup() {
    console.log("Cleaning up test users (Exhaustive)...");
    for (const mobile of testMobiles) {
        try {
            const user = await prisma.user.findUnique({ where: { mobile } });
            if (user) {
                const uid = user.id;
                const safeDelete = async (model, cond) => { try { await prisma[model].deleteMany({ where: cond }); } catch(e){} };

                // Handle all relations from schema.prisma
                await safeDelete('announcement', { created_by: uid });
                await safeDelete('bonusLedger', { userId: uid });
                await safeDelete('bonusLedger', { sourceUserId: uid });
                await safeDelete('message', { receiverId: uid });
                await safeDelete('message', { senderId: uid });
                await safeDelete('payout', { userId: uid });
                await safeDelete('referral', { referrerId: uid });
                await safeDelete('referral', { referredUserId: uid });
                await safeDelete('systemExpense', { adminId: uid });
                await safeDelete('systemLog', { adminId: uid });
                await safeDelete('systemLog', { targetUserId: uid });
                await safeDelete('transaction', { userId: uid });
                await safeDelete('userRank', { userId: uid });
                await safeDelete('walletCash', { userId: uid });
                await safeDelete('walletMinute', { userId: uid });
                
                // Finally delete the user
                await prisma.user.delete({ where: { id: uid } });
                console.log(`Deleted user: ${mobile}`);
            }
        } catch (e) {
            console.log(`Error deleting ${mobile}: ${e.message}`);
        }
    }
    console.log("Exhaustive Cleanup complete.");
    process.exit(0);
}

cleanup();
