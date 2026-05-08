const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const filename = path.join(backupDir, `sinaank_backup_${timestamp}.json`);

    try {
        console.log('Starting backup...');
        const users = await prisma.user.findMany({
            include: {
                wallets: true,
                transactions: true,
                payouts: true
            }
        });

        const transactions = await prisma.transaction.findMany();
        const payments = await prisma.paymentOrder.findMany();
        const visits = await prisma.siteVisit.findMany();

        const data = {
            timestamp: new Date().toISOString(),
            users,
            transactions,
            payments,
            visits
        };

        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Backup saved to: ${filename}`);
        console.log(`Summary: ${users.length} users, ${transactions.length} transactions.`);
    } catch (error) {
        console.error('Backup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
