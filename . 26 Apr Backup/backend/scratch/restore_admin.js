const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mobile = '9211755211';
    console.log(`Restoring Admin User: ${mobile}`);

    let user = await prisma.user.findUnique({ where: { mobile } });
    
    if (!user) {
        user = await prisma.user.create({
            data: {
                mobile,
                name: 'Sinaank Master Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
                plan: 'PREMIUM',
                referralCode: 'SINAANK1',
                minutesBalance: 999999
            }
        });
        console.log('Admin User Created.');
    } else {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN', status: 'ACTIVE' }
        });
        console.log('Admin User Updated.');
    }

    // Wallets
    const cashWallet = await prisma.wallet.findFirst({ where: { userId: user.id, type: 'CASH' } });
    if (!cashWallet) {
        await prisma.wallet.create({ data: { userId: user.id, type: 'CASH', balance: 0 } });
    }

    console.log('Admin Restoration Complete:', user);
    process.exit(0);
}
main();
