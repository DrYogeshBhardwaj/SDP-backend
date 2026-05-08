const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUser(mobile) {
    console.log(`Fixing user: ${mobile}`);
    try {
        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) {
            console.error('User not found!');
            return;
        }

        // Update Minutes and Plan (Free entry but 3600 mins)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                minutesBalance: 3600,
                plan: 'FREE' // As requested: "free entry with 3600 min"
            }
        });

        // Ensure CASH wallet has 100/-
        const wallet = await prisma.wallet.findFirst({
            where: { userId: user.id, type: 'CASH' }
        });

        if (wallet) {
            await prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: 100 }
            });
        } else {
            await prisma.wallet.create({
                data: { userId: user.id, type: 'CASH', balance: 100 }
            });
        }

        // Add transaction record for audit
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 100,
                type: 'CREDIT',
                category: 'BONUS',
                description: 'Special balance update by Admin'
            }
        });

        console.log('User 9953869409 updated successfully: 3600 min and 100/- earning.');

    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const targetMobile = '9953869409';
fixUser(targetMobile);
