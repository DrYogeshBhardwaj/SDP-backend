const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const usersToday = await prisma.user.count({
        where: { createdAt: { gte: today } }
    });
    
    const usersYesterday = await prisma.user.count({
        where: { 
            createdAt: { 
                gte: new Date(today.getTime() - 24*60*60*1000),
                lt: today
            } 
        }
    });

    const totalUsers = await prisma.user.count();

    console.log('Total Users:', totalUsers);
    console.log('Users Joined Today (May 2):', usersToday);
    console.log('Users Joined Yesterday (May 1):', usersYesterday);
    
    const recentUsers = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { mobile: true, createdAt: true, plan: true }
    });
    console.log('Recent 5 Users:', JSON.stringify(recentUsers, null, 2));

    process.exit(0);
}

check();
