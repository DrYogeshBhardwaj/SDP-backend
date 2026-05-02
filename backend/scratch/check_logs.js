const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const logs = await prisma.securityLog.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' }
    });
    
    console.log('Security Logs Today:', JSON.stringify(logs, null, 2));

    const visits = await prisma.siteVisit.findMany({
        where: { createdAt: { gte: today } },
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Recent 10 Visits Today:', JSON.stringify(visits, null, 2));

    process.exit(0);
}

check();
