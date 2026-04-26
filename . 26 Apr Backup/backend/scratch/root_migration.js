const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rootMigration() {
    console.log("--- STARTING ROOT IDENTITY MIGRATION ---");

    try {
        // 1. Delete 9625645211 (cleanup as requested)
        const targetToDelete = '9625645211';
        const userToDelete = await prisma.user.findUnique({ where: { mobile: targetToDelete } });
        if (userToDelete) {
            console.log(`Deleting ${targetToDelete} history...`);
            await prisma.transaction.deleteMany({ where: { userId: userToDelete.id } });
            await prisma.wallet.deleteMany({ where: { userId: userToDelete.id } });
            await prisma.user.delete({ where: { id: userToDelete.id } });
            console.log(`Deleted ${targetToDelete} successfully.`);
        }

        // 2. Identity Swap: 9211755211 -> 7777777777
        const currentRoot = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
        if (currentRoot) {
            console.log(`Moving Root Node from 9211755211 to 7777777777...`);
            await prisma.user.update({
                where: { id: currentRoot.id },
                data: { 
                    mobile: '7777777777',
                    name: 'Root Sinaank' // Set a generic name for the top node
                }
            });
            console.log("Root Identity Swapped Successfully.");
        } else {
            console.warn("9211755211 not found! Skipping swap.");
        }

        console.log("--- MIGRATION COMPLETE ---");
        console.log("Next Step: User should register 9211755211 as a new partner.");
    } catch (err) {
        console.error("MIGRATION FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

rootMigration();
