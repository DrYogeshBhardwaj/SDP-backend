/**
 * generate_daily_report.js
 * SINAANK Production Monitoring Tool
 * Fetches today's vital stats for Demo, Join, and Revenue.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateReport() {
    console.log("------------------------------------------");
    console.log("🚀 SINAANK DAILY PRODUCTION REPORT");
    console.log("------------------------------------------");

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [demoCount, joinCount, payments] = await Promise.all([
            prisma.systemLog.count({
                where: {
                    actionType: 'DEMO_VIEWED',
                    createdAt: { gte: today }
                }
            }),
            prisma.user.count({
                where: {
                    createdAt: { gte: today }
                }
            }),
            prisma.paymentOrder.findMany({
                where: {
                    status: 'PAID',
                    createdAt: { gte: today }
                }
            })
        ]);

        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const conversion = demoCount > 0 ? ((joinCount / demoCount) * 100).toFixed(2) : "0.00";

        console.log(`Date:       ${today.toISOString().split('T')[0]}`);
        console.log(`Demo Views: ${demoCount}`);
        console.log(`Joins:      ${joinCount}`);
        console.log(`Revenue:    ₹${totalRevenue}`);
        console.log(`Conversion: ${conversion}%`);
        console.log("------------------------------------------");

        if (totalRevenue > 0) {
            console.log("✅ Revenue mode ACTIVE.");
        } else {
            console.log("⚠️ No revenue recorded yet today.");
        }

    } catch (err) {
        console.error("Failed to generate report:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

generateReport();
