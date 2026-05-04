const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertUsers() {
    const mobiles = ['9711812177', '9319792630'];
    console.log(`--- REVERTING USERS TO FREE: ${mobiles.join(', ')} ---`);

    for (const mobile of mobiles) {
        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) {
            console.log(`❌ User ${mobile} not found.`);
            continue;
        }

        // 1. Revert Plan
        await prisma.user.update({
            where: { mobile },
            data: {
                plan: 'FREE',
                isBusinessUnlocked: false,
                minutesBalance: 0 // Resetting balance since they didn't pay
            }
        });
        console.log(`✅ User ${mobile} reverted to FREE.`);

        // 2. Remove related revenue transactions (to fix stats)
        const deletedTxs = await prisma.transaction.deleteMany({
            where: { 
                userId: user.id,
                category: 'PLAN_UPGRADE'
            }
        });
        console.log(`✅ Removed ${deletedTxs.count} revenue transactions for ${mobile}.`);

        // 3. Remove any commissions generated FROM this user
        const deletedCommissions = await prisma.transaction.deleteMany({
            where: {
                fromUserId: user.id,
                category: 'BONUS'
            }
        });
        console.log(`✅ Removed ${deletedCommissions.count} commission transactions triggered by ${mobile}.`);
    }

    process.exit(0);
}

revertUsers();
