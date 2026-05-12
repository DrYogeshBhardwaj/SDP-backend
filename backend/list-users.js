const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const userCount = await prisma.user.count();
        console.log(`Total users: ${userCount}`);
        
        const recentUsers = await prisma.user.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { mobile: true, name: true, plan: true, createdAt: true }
        });
        console.log('Most recent 10 users:', JSON.stringify(recentUsers, null, 2));

        const searchUser = await prisma.user.findMany({
            where: {
                mobile: {
                    contains: '9711'
                }
            }
        });
        console.log('Users containing 9711:', JSON.stringify(searchUser, null, 2));

    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
