const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepCleanMain() {
    try {
        const user = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
        if (!user) {
            console.log("User 9211755211 not found.");
            return;
        }

        console.log("Wiping history for 9211755211...");

        // 1. Delete all transactions for this user
        await prisma.transaction.deleteMany({ where: { userId: user.id } });

        // 2. Zero out wallet balance
        await prisma.wallet.updateMany({
            where: { userId: user.id, type: 'CASH' },
            data: { balance: 0 }
        });

        // 3. Reset Minutes Balance to default 3600
        await prisma.user.update({
            where: { id: user.id },
            data: { minutesBalance: 3600 }
        });

        console.log("Deep Clean Successful. Dashboard should now be ₹0.");
    } catch (err) {
        console.error("Deep Clean failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

deepCleanMain();
