const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateMinutes() {
    const mobile = '7777777777';
    console.log(`[Minutes] Updating minutes for ${mobile}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        if (!user) {
            console.error(`❌ User with mobile ${mobile} not found.`);
            return;
        }

        const wallet = await prisma.walletMinute.upsert({
            where: { userId: user.id },
            update: { balance: 100 },
            create: { userId: user.id, balance: 100 }
        });

        console.log(`✅ Success! User ${mobile} now has ${wallet.balance} minutes.`);
    } catch (error) {
        console.error('❌ Error updating minutes:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateMinutes();
