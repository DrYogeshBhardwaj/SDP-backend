const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
    reconcileSDMInternal, reconcileSDDInternal, 
    reconcileSDBInternal, reconcileSDEInternal, reconcileSDPInternal,
    reconcileSDSInternal // Assuming this exists or should be added
} = require('./src/modules/minutes/minutes.controller');

async function runTest() {
    console.log("🚀 Starting Full Platform Reconciliation Verification...");

    // Create a Test User
    const testUser = await prisma.user.upsert({
        where: { mobile: '9999999999' },
        update: {},
        create: {
            mobile: '9999999999',
            name: 'Test Deployment User',
            pin_hash: 'hashed_pin',
            cid: 'CID_TEST_99',
            role: 'USER_178'
        }
    });

    const userId = testUser.id;

    // Set up Wallet
    await prisma.walletMinute.upsert({
        where: { userId },
        update: { balance: 1000 },
        create: { userId, balance: 1000 }
    });

    const scenarios = [
        { name: 'SDB (Breathing)', field_start: 'active_sdb_start', field_ping: 'active_sdb_last_ping', reconcile: reconcileSDBInternal },
        { name: 'SDE (Eye Relax)', field_start: 'active_sde_start', field_ping: 'active_sde_last_ping', reconcile: reconcileSDEInternal },
        { name: 'SDP (Pause)', field_start: 'active_sdp_start', field_ping: 'active_sdp_last_ping', reconcile: reconcileSDPInternal },
        { name: 'SDM (Movement)', field_start: 'active_sdm_start', field_ping: 'active_sdm_last_ping', reconcile: reconcileSDMInternal },
        { name: 'SDD (Digestion)', field_start: 'active_sdd_start', field_ping: 'active_sdd_last_ping', reconcile: reconcileSDDInternal }
    ];

    for (const scenario of scenarios) {
        process.stdout.write(`Testing ${scenario.name}... `);

        const now = new Date();
        const startTime = new Date(now.getTime() - (5.5 * 60 * 1000)); // 5.5 mins ago
        const lastPing = new Date(now.getTime() - (0.5 * 60 * 1000)); // 0.5 mins ago (approx 5 mins usage)

        await prisma.user.update({
            where: { id: userId },
            data: {
                [scenario.field_start]: startTime,
                [scenario.field_ping]: lastPing
            }
        });

        const result = await scenario.reconcile(userId);
        
        // Duration check: lastPing - startTime = 5 mins.
        if (result.deducted === 5) {
            console.log("✅ PASSED (Deducted 5 mins)");
        } else {
            console.log(`❌ FAILED (Expected 5, got ${result.deducted})`);
        }
    }

    console.log("\n✨ Final Deployment Check Complete.");
    await prisma.$disconnect();
}

runTest().catch(err => {
    console.error(err);
    prisma.$disconnect();
});
