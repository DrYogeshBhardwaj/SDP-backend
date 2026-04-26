const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testController() {
    const users = await prisma.user.findMany({
        select: { 
            id: true, 
            mobile: true, 
            name: true, 
            sponsorId: true,
            role: true,
            createdAt: true
        }
    });
    console.log('Controller data count:', users.length);
    console.log('Sample user:', JSON.stringify(users[0], null, 2));
    await prisma.$disconnect();
}
testController();
