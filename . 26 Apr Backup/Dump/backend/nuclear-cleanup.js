const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nuclearCleanup() {
    console.log("NUCLEAR CLEANUP: Truncating all transactional tables...");
    try {
        const tables = [
            '"BonusLedger"', '"Transaction"', '"Payout"', '"Referral"', 
            '"UserRank"', '"WalletCash"', '"WalletMinute"', '"Message"', 
            '"Announcement"', '"SystemLog"', '"SystemExpense"', '"User"'
        ];

        for (const table of tables) {
            try {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
                console.log(`Truncated ${table}`);
            } catch (e) {
                console.log(`Failed to truncate ${table}: ${e.message}`);
            }
        }

        // Re-create Admin
        console.log("Re-creating Admin (9999999999)...");
        const { hashPin } = require('./src/utils/hash');
        const pin_hash = await hashPin('1234');
        await prisma.user.create({
            data: {
                mobile: '9999999999',
                cid: 'ADMIN_001',
                name: 'System Admin',
                pin_hash,
                role: 'ADMIN',
                status: 'ACTIVE',
                kit_activated: true
            }
        });

        console.log("Nuclear Cleanup complete.");
        process.exit(0);
    } catch (error) {
        console.error("Nuclear Cleanup failed:", error);
        process.exit(1);
    }
}

nuclearCleanup();
