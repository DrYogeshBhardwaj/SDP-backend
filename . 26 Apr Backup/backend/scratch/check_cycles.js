const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCycles() {
    const users = await prisma.user.findMany({ select: { id: true, sponsorId: true, mobile: true } });
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);
    
    for (const user of users) {
        let current = user;
        const visited = new Set();
        while (current && current.sponsorId) {
            if (visited.has(current.id)) {
                console.log('CYCLE DETECTED at:', current.mobile);
                break;
            }
            visited.add(current.id);
            current = userMap[current.sponsorId];
            if (!current) break;
        }
    }
    console.log('Cycle check complete.');
    await prisma.$disconnect();
}
checkCycles();
