const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * Log Demo Start (Anonymous)
 * Tracks conversion from Demo to Join.
 */
async function logDemoStart(req, res) {
    try {
        // Use a burner admin ID or system-level ID if not provided
        // For public stats, we use a fixed system identifier
        const SYSTEM_BURNER_ID = '00000000-0000-0000-0000-000000000000'; 

        await prisma.systemLog.create({
            data: {
                adminId: SYSTEM_BURNER_ID, // System auto-log
                actionType: 'DEMO_VIEWED',
                description: `Demo viewed from IP: ${req.ip || 'unknown'}`
            }
        });

        return successResponse(res, 'Demo logged');
    } catch (err) {
        console.error("Stats Log Error:", err);
        return successResponse(res, 'Logged'); // Silent fail for analytics
    }
}

/**
 * Get Daily Analytics Stats
 * For the Reporting Script
 */
async function getDailyReportStats(req, res) {
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

        return successResponse(res, 'Stats fetched', {
            date: today.toISOString().split('T')[0],
            demoCount,
            joinCount,
            revenue: totalRevenue,
            conversion: demoCount > 0 ? ((joinCount / demoCount) * 100).toFixed(2) : 0
        });
    } catch (err) {
        return errorResponse(res, 500, err.message);
    }
}

module.exports = {
    logDemoStart,
    getDailyReportStats,
    getScalingStats: getDailyReportStats // Alias for the Scaling Monitor
};
