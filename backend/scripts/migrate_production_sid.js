const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateUniqueSID } = require('../src/modules/user/sid.service');

async function main() {
    console.log('--- Starting Final SID Migration ---');

    // 1. Find all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} total users.`);

    let migratedCount = 0;

    for (const user of users) {
        // If user already has the new SID structure, skip
        if (user.sid_id && user.sid_combo_id) {
            console.log(`Skipping User ${user.mobile} (Already has SID: ${user.sid_id})`);
            continue;
        }

        try {
            console.log(`Migrating User ${user.mobile}...`);
            await generateUniqueSID(user.id);
            migratedCount++;
        } catch (error) {
            console.error(`Failed to migrate user ${user.mobile}:`, error.message);
        }
    }

    console.log(`--- Migration Finished: ${migratedCount} users updated ---`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
