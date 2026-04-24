const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sidService = require('../src/modules/user/sid.service');

async function migrate() {
    console.log('--- Starting SID Migration ---');
    const users = await prisma.user.findMany({
        where: { sid_color1: null }
    });

    console.log(`Found ${users.length} users with missing SIDs.`);

    let migrated = 0;
    for (const user of users) {
        try {
            await sidService.generateUniqueSID(user.id);
            migrated++;
            if (migrated % 10 === 0) console.log(`Migrated ${migrated}/${users.length}...`);
        } catch (err) {
            console.error(`Failed to migrate user ${user.mobile}:`, err.message);
        }
    }

    console.log(`--- Migration Finished: ${migrated} users updated ---`);
    process.exit(0);
}

migrate();
