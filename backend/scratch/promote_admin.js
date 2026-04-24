const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote() {
    const mobile = '9211755211';
    console.log(`Promoting ${mobile} to ADMIN...`);
    
    try {
        const user = await prisma.user.upsert({
            where: { mobile },
            update: { role: 'ADMIN', status: 'ACTIVE' },
            create: {
                mobile,
                name: 'Main Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
                minutesBalance: 999999
            }
        });
        
        console.log('SUCCESS: User promoted to ADMIN.');
        console.log(user);

        // Also ensure they have a wallet
        await prisma.wallet.upsert({
            where: { userId_type: { userId: user.id, type: 'CASH' } },
            update: {},
            create: { userId: user.id, type: 'CASH', balance: 0 }
        });
        
        console.log('Wallet verified.');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

promote();
