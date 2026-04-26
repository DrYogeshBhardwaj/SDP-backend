const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const count = await prisma.user.count();
        console.log('Successfully connected. User count:', count);
        
        // Check if age_group field is available
        const testUser = await prisma.user.findFirst({
            select: { age_group: true }
        });
        console.log('Successfully queried age_group. First user age_group:', testUser ? testUser.age_group : 'none');
        
    } catch (e) {
        console.error('Connection/Query failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
