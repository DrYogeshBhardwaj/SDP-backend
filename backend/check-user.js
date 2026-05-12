const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser(mobile) {
    console.log(`Checking user with mobile: ${mobile}`);
    try {
        const user = await prisma.user.findUnique({
            where: { mobile },
            include: {
                wallets: true,
                transactions: true,
                sponsor: true
            }
        });

        if (!user) {
            console.log('User not found in User table.');
        } else {
            console.log('User found:', JSON.stringify(user, null, 2));
        }

        const orders = await prisma.paymentOrder.findMany({
            where: { mobile }
        });

        console.log('Payment Orders for this mobile:', JSON.stringify(orders, null, 2));

        const transactionsFromOthers = await prisma.transaction.findMany({
            where: { fromUserId: user ? user.id : undefined }
        });
        console.log('Transactions where this user was the source (commissions):', JSON.stringify(transactionsFromOthers, null, 2));

    } catch (error) {
        console.error('Error checking user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const mobile = '9711812177';
checkUser(mobile);
