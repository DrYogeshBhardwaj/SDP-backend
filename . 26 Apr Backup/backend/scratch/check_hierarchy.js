const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        select: { id: true, mobile: true, name: true, sponsorId: true }
    });
    
    const map = {};
    users.forEach(u => map[u.id] = u);
    
    console.log("--- CURRENT HIERARCHY ---");
    users.forEach(u => {
        const s = map[u.sponsorId];
        console.log(`User: ${u.mobile} (${u.name}) | Sponsor: ${s ? s.mobile + ' (' + s.name + ')' : 'NONE'}`);
    });
    await prisma.$disconnect();
}
check();
