const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mobile = '9211755211';
    console.log(`Searching for user: ${mobile}...`);
    
    const user = await prisma.user.findUnique({ 
        where: { mobile } 
    });

    if (user) {
        console.log(`Found user ${user.id}. Deleting associated data...`);
        
        // Delete dependent records
        await prisma.transaction.deleteMany({ where: { userId: user.id } });
        await prisma.wallet.deleteMany({ where: { userId: user.id } });
        await prisma.therapySession.deleteMany({ where: { userId: user.id } });
        await prisma.paymentOrder.deleteMany({ where: { mobile: user.mobile } });
        await prisma.supportQuery.deleteMany({ where: { userId: user.id } });
        
        // Finally delete user
        await prisma.user.delete({ where: { id: user.id } });
        
        console.log('User 9211755211 and all data deleted successfully.');
    } else {
        console.log('User not found.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
