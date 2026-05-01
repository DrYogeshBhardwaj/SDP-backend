const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const generateReferralCode = () => {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SIN-${suffix}`;
};

async function fixUsers() {
    try {
        const users = await prisma.user.findMany({
            where: { isBusinessUnlocked: true, referralCode: null }
        });
        
        console.log(`Found ${users.length} users to fix.`);
        
        for (const user of users) {
            let code;
            let isUnique = false;
            while(!isUnique) {
                code = generateReferralCode();
                const exists = await prisma.user.findUnique({ where: { referralCode: code } });
                if(!exists) isUnique = true;
            }
            
            await prisma.user.update({
                where: { id: user.id },
                data: { referralCode: code }
            });
            console.log(`Fixed user ${user.mobile} with code ${code}`);
        }
        console.log('Finished fixing users.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixUsers();
