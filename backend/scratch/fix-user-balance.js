const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUser() {
    const mobile = '911755211'; 
    const user = await prisma.user.findUnique({ where: { mobile } });
    
    if (user) {
        console.log(`Fixing user ${mobile}...`);
        await prisma.user.update({
            where: { mobile },
            data: {
                minutesBalance: 3600,
                dailyMinutesUsed: 0,
                plan: 'PREMIUM',
                isBusinessUnlocked: true
            }
        });
        console.log('Fixed successfully.');
    } else {
        console.log(`User ${mobile} not found.`);
        // Try with 9211755211
        const admin = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
        if (admin) {
             console.log(`Fixing admin 9211755211...`);
             await prisma.user.update({
                where: { mobile: '9211755211' },
                data: {
                    minutesBalance: 3600,
                    dailyMinutesUsed: 0,
                    plan: 'PREMIUM',
                    isBusinessUnlocked: true
                }
            });
            console.log('Fixed successfully.');
        }
    }
    process.exit(0);
}

fixUser();
