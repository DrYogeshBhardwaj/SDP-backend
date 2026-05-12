const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupRevenue() {
    console.log('\n--- SINAANK REVENUE PURGE & RESET (FRESH START) ---');
    console.log('Action: Deleting ALL old revenue records and recreating the official 15 entries.\n');

    const correctEntries = [
        { mobile: '9540068900', name: 'Ravi yadav', date: '2026-05-12', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9821763070', name: 'Pooja', date: '2026-05-12', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8851419684', name: 'Anushka bhardwaj', date: '2026-05-11', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8527841181', name: 'Tashi', date: '2026-05-11', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9818869428', name: 'Sangeeta Sharma', date: '2026-05-10', description: 'Manual Activation via Password (₹299)' },
        { mobile: '7669195673', name: 'Aviraj Kaushik', date: '2026-05-09', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9350184552', name: 'Komal Sharma', date: '2026-05-09', description: 'Verified Payment Received (Order: order_SnIn3ELYLPX6xv)' },
        { mobile: '8851168290', name: 'Poonam Sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8527401392', name: 'Khushi sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9953869409', name: 'Sahil', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9711812177', name: 'Amandeep Gulia', date: '2026-05-08', description: 'Verified Payment Received (Order: order_SnIn3ELYLPX6xv)' },
        { mobile: '9211755211', name: 'Dr Yogesh Bhardwaj', date: '2026-05-07', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9210021221', name: 'Manisha Sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9625645211', name: 'Shubham pandat', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8368668299', name: 'Prachi Sharma', date: '2026-05-10', description: 'Manual Activation via Password (₹299)' }
    ];

    try {
        // 1. PURGE ALL OLD DATA
        const purgeRes = await prisma.transaction.deleteMany({
            where: {
                category: { in: ['PLAN_UPGRADE', 'REGISTRATION_FEE'] }
            }
        });
        console.log(`[!] PURGED ${purgeRes.count} old revenue records.`);

        // 2. RECREATE FRESH DATA
        let createdCount = 0;
        for (const entry of correctEntries) {
            const user = await prisma.user.findUnique({ where: { mobile: entry.mobile } });
            if (!user) {
                console.log(`[?] User ${entry.mobile} missing from User table. Skipping re-creation.`);
                continue;
            }

            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: 299,
                    type: 'CREDIT',
                    category: 'PLAN_UPGRADE',
                    description: entry.description,
                    createdAt: new Date(entry.date)
                }
            });
            createdCount++;
            console.log(`[+] Re-created entry for ${entry.mobile}`);
        }

        console.log(`\nRESET COMPLETE!`);
        console.log(`Purged: ${purgeRes.count}`);
        console.log(`Re-created: ${createdCount} (Target: 15)`);
        console.log(`Final Total In: ₹${createdCount * 299}`);

    } catch (err) {
        console.error('Purge failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupRevenue();
