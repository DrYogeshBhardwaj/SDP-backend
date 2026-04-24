const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTree() {
    const users = await prisma.user.findMany({
        select: { id: true, mobile: true, sponsorId: true }
    });
    
    console.log(`Total Users: ${users.length}`);
    
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);
    
    const roots = [];
    const orphans = [];
    
    users.forEach(u => {
        if (!u.sponsorId) {
            roots.push(u.mobile);
        } else if (!userMap[u.sponsorId]) {
            orphans.push(`${u.mobile} (Sponsor ${u.sponsorId} not found)`);
        }
    });
    
    console.log('Roots (No Sponsor):', roots);
    console.log('Orphans (Sponsor missing):', orphans);
    
    await prisma.$disconnect();
}

debugTree();
