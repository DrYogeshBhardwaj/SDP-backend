const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser(mobile) {
    try {
        const user = await prisma.user.findUnique({
            where: { mobile },
            include: { wallets: true }
        });
        console.log('USER_DATA:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

// Pass mobile as argument
const mobile = process.argv[2];
if (!mobile) {
    console.error('Please provide mobile number');
    process.exit(1);
}
checkUser(mobile);
