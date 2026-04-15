const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const sidService = require('../user/sid.service');

/**
 * Audit Helper: Log Admin Actions
 */
const logAdminAction = async (adminId, actionType, targetUserId, description) => {
    try {
        await prisma.systemLog.create({
            data: {
                adminId,
                actionType,
                targetUserId,
                description
            }
        });
    } catch (err) {
        console.error("Critical: Failed to log admin action", err);
    }
};

/**
 * 1. Dashboard Stats
 * System Wallet = Total Joins (Purchases) - Total Income PAID (Frozen) - Withdrawals PAID (Manual)
 */
const getDashboardStats = async (req, res) => {
    try {
        const { getSystemWallet } = require('../finance/finance.service');
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalUsers,
            activeToday,
            todayJoins,
            todayPayments,
            totalIncomePaid,
            pendingPayoutAmount,
            totalPayoutApproved,
            todayTherapyMinutes,
            activeSessions,
            todayDemos
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { last_active_at: { gte: todayStart } } }),
            prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
            prisma.paymentOrder.aggregate({ 
                _sum: { amount: true }, 
                where: { status: 'PAID', createdAt: { gte: todayStart } } 
            }),
            prisma.bonusLedger.aggregate({ 
                _sum: { amount: true }, 
                where: { incomeStatus: 'PAID' } 
            }),
            prisma.payout.aggregate({ 
                _sum: { amount: true }, 
                where: { payoutStatus: 'PENDING' } 
            }),
            prisma.payout.aggregate({ 
                _sum: { amount: true }, 
                where: { payoutStatus: { in: ['APPROVED', 'PAID'] } } 
            }),
            prisma.therapySession.aggregate({
                _sum: { minutesUsed: true },
                where: { status: 'COMPLETED', endedAt: { gte: todayStart } }
            }),
            prisma.therapySession.count({
                where: { status: 'ACTIVE' }
            }),
            prisma.systemLog.count({
                where: { actionType: 'DEMO_VIEWED', createdAt: { gte: todayStart } }
            })
        ]);

        const systemWallet = await getSystemWallet();
        const conversionRate = todayDemos > 0 ? (todayJoins / todayDemos) * 100 : 0;

        return successResponse(res, 200, 'Dashboard stats retrieved', {
            totalUsers,
            activeToday,
            todayJoin: todayJoins,
            todayDemos,
            conversionRate,
            todayIncome: todayPayments._sum.amount || 0,
            totalIncome: totalIncomePaid._sum.amount || 0,
            pendingPayout: pendingPayoutAmount._sum.amount || 0,
            totalPayout: totalPayoutApproved._sum.amount || 0,
            todayTherapyMinutes: todayTherapyMinutes._sum.minutesUsed || 0,
            activeSessions,
            systemWallet
        });
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        return errorResponse(res, 500, 'Failed to fetch dashboard stats');
    }
};

/**
 * 2. User Management
 */
const getUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const where = {};
        if (search) where.mobile = { contains: search };
        if (role) where.role = role;
        if (status) where.status = status;

        const users = await prisma.user.findMany({
            where,
            include: {
                referredBy: { include: { referrer: { select: { mobile: true, name: true } } } },
                minutes: true,
                cash: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const { getDerivedBalance } = require('../finance/finance.service');
        const formatted = await Promise.all(users.map(async (u) => {
            const walletCash = await getDerivedBalance(u.id);
            return {
                id: u.id,
                sinaankId: u.referral_code || '-',
                mobile: u.mobile,
                name: u.name,
                role: u.role,
                status: u.status,
                createdAt: u.createdAt,
                sponsor: u.referredBy[0]?.referrer?.mobile || 'Direct',
                walletMinute: u.minutes?.balance || 0,
                walletCash: walletCash,
                sid_id: u.sid_id || '-',
                sid_combo_id: u.sid_combo_id || '-',
                sid_color1: u.sid_color1 !== null ? `hsl(${u.sid_color1}, 70%, 50%)` : null,
                sid_color2: u.sid_color2 !== null ? `hsl(${u.sid_color2}, 70%, 50%)` : null,
                sid_left_hz: u.sid_left_hz,
                sid_right_hz: u.sid_right_hz
            };
        }));

        return successResponse(res, 200, 'Users retrieved', formatted);
    } catch (error) {
        console.error('Get Users Error:', error);
        return errorResponse(res, 500, 'Failed to fetch users');
    }
};

const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.update({ where: { id }, data: { status: 'BLOCKED' } });
        await logAdminAction(req.user.id, 'BLOCK_USER', id, 'User blocked by admin');
        return successResponse(res, 200, 'User blocked successfully');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to block user');
    }
};

const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
        await logAdminAction(req.user.id, 'UNBLOCK_USER', id, 'User unblocked by admin');
        return successResponse(res, 200, 'User unblocked successfully');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to unblock user');
    }
};

const upgradeUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        await prisma.user.update({ where: { id }, data: { role } });
        await logAdminAction(req.user.id, 'UPGRADE_USER', id, `Role updated to ${role}`);
        return successResponse(res, 200, `User upgraded to ${role}`);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to upgrade user');
    }
};

/**
 * 3. Income Ledger (Freeze Logic)
 */
const getIncomeLedger = async (req, res) => {
    try {
        const income = await prisma.bonusLedger.findMany({
            include: { user: { select: { mobile: true } }, sourceUser: { select: { mobile: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return successResponse(res, 200, 'Income ledger retrieved', income);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch income ledger');
    }
};

const updateIncomeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // APPROVED, PAID

        const income = await prisma.bonusLedger.findUnique({ where: { id } });
        if (income.incomeStatus === 'PAID') return errorResponse(res, 400, 'PAID income is frozen and immutable');

        await prisma.bonusLedger.update({ where: { id }, data: { incomeStatus: status } });
        await logAdminAction(req.user.id, 'INCOME_STATUS_CHANGE', income.userId, `Income ${id} status moved to ${status}`);

        return successResponse(res, 200, `Income marked as ${status}`);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to update income status');
    }
};

const manualIncome = async (req, res) => {
    try {
        const { userId, amount, type, remarks } = req.body;
        const adminId = req.user.id;

        if (!userId || !amount) return errorResponse(res, 400, 'User ID and Amount required');

        const income = await prisma.bonusLedger.create({
            data: {
                userId,
                amount: parseFloat(amount),
                type: type || 'MANUAL',
                incomeStatus: 'PENDING'
            }
        });

        await logAdminAction(adminId, 'MANUAL_INCOME_CREATED', userId, `Manual income of ${amount} created. Remarks: ${remarks || 'None'}`);

        return successResponse(res, 201, 'Manual income created successfully', income);
    } catch (error) {
        console.error('Manual Income Error:', error);
        return errorResponse(res, 500, 'Failed to create manual income');
    }
};

/**
 * 4. Transaction Ledger (Read-only)
 */
const getTransactionLedger = async (req, res) => {
    try {
        const txns = await prisma.transaction.findMany({
            include: { user: { select: { mobile: true } } },
            orderBy: { transactionDate: 'desc' },
            take: 100
        });
        return successResponse(res, 200, 'Transaction ledger retrieved', txns);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch transaction ledger');
    }
};

/**
 * 5. Messages / Notifications (Log Push)
 */
const manageMessages = async (req, res) => {
    try {
        const { type, title, message, receiverId, priority } = req.body;
        const adminId = req.user.id;

        if (type === 'GLOBAL') {
            await prisma.announcement.create({
                data: { title, message, created_by: adminId, priority: priority || 'NORMAL' }
            });
            await logAdminAction(adminId, 'MESSAGE_PUSH_GLOBAL', null, `Global msg: ${title}`);
        } else {
            await prisma.message.create({
                data: { content: message, senderId: adminId, receiverId }
            });
            await logAdminAction(adminId, 'MESSAGE_PUSH_PRIVATE', receiverId, `Private msg: ${message.substring(0, 20)}...`);
        }

        return successResponse(res, 201, 'Message sent successfully');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to send message');
    }
};

/**
 * 6. Payout Control (Snapshot Logic)
 */
const getPayouts = async (req, res) => {
    try {
        const payouts = await prisma.payout.findMany({
            include: { user: { select: { name: true, mobile: true, upi_id: true } } },
            orderBy: { requested_at: 'desc' }
        });
        return successResponse(res, 200, 'Payouts retrieved', payouts);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch payouts');
    }
};

const updatePayoutStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // APPROVED, PAID, REJECTED

        const payout = await prisma.payout.findUnique({ where: { id } });

        await prisma.payout.update({
            where: { id },
            data: { payoutStatus: status, remarks, processed_at: new Date(), processed_by: req.user.id }
        });
        if (!payout) return errorResponse(res, 404, 'Payout not found');

        const data = { payoutStatus: status, remarks, processed_at: new Date(), processed_by: req.user.id };

        // Snapshot Logic & Transaction Reconciliation
        if (status === 'APPROVED') {
            const { getDerivedBalance, getSystemWallet } = require('../finance/finance.service');
            const currentWallet = await getDerivedBalance(payout.userId);
            const sysWallet = await getSystemWallet();

            data.wallet_before = currentWallet;
            data.system_wallet_snapshot = sysWallet;
        }

        if (status === 'PAID') {
            const { getDerivedBalance } = require('../finance/finance.service');
            data.wallet_after = await getDerivedBalance(payout.userId);
        }

        await prisma.$transaction(async (tx) => {
            await tx.payout.update({ where: { id }, data });

            // Update Transaction Ledger Status
            const txn = await tx.transaction.findFirst({
                where: { referenceId: id, type: 'PAYOUT' }
            });

            if (txn) {
                await tx.transaction.update({
                    where: { id: txn.id },
                    data: {
                        txStatus: status === 'PAID' ? 'PAID' : (status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
                        description: `Payout Status: ${status}`
                    }
                });
            }

            // Cleanup activePayoutId on finish
            if (status === 'PAID' || status === 'REJECTED') {
                await tx.walletCash.update({
                    where: { userId: payout.userId },
                    data: { activePayoutId: null }
                });
            }
        });

        await logAdminAction(req.user.id, `PAYOUT_${status}`, payout.userId, `Payout ${id} marked as ${status}`);

        return successResponse(res, 200, `Payout marked as ${status}`);
    } catch (error) {
        console.error('Update Payout Error:', error);
        return errorResponse(res, 500, 'Failed to update payout status');
    }
};

/**
 * 7. Therapy Usage Tracking
 */
const getTherapyLogs = async (req, res) => {
    try {
        const logs = await prisma.therapySession.findMany({
            include: { user: { select: { mobile: true, name: true } } },
            orderBy: { startedAt: 'desc' },
            take: 100
        });
        return successResponse(res, 200, 'Therapy logs retrieved', logs);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch therapy logs');
    }
};

/**
 * 8. SID Management
 */
const regenerateUserSID = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const updatedUser = await sidService.archiveAndRegenerate(id, adminId);
        
        await logAdminAction(adminId, 'REGENERATE_SID', id, `SID regenerated by admin. New seed: ${updatedUser.sid_seed}`);

        return successResponse(res, 200, 'SID regenerated successfully', {
            color1: updatedUser.sid_color1,
            color2: updatedUser.sid_color2,
            leftHz: updatedUser.sid_left_hz,
            rightHz: updatedUser.sid_right_hz
        });
    } catch (error) {
        console.error('Regenerate SID Error:', error);
        return errorResponse(res, 500, 'Failed to regenerate SID');
    }
};

/**
 * Get detailed user information including SID history
 */
const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                sid_history: {
                    orderBy: {
                        archivedAt: 'desc'
                    }
                }
            }
        });

        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        const sidHistory = user.sid_history || [];
        const regeneratedCount = sidHistory.length;
        const sidVersion = regeneratedCount + 1;

        const data = {
            id: user.id,
            name: user.name,
            mobile: user.mobile,
            sinaankId: user.referral_code || '-',
            sid_id: user.sid_id || '-',
            sid_combo_id: user.sid_combo_id || '-',
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            // Therapy SID Profile
            sid: {
                sidId: user.sid_id,
                comboId: user.sid_combo_id,
                color1: user.sid_color1 !== null ? `hsl(${user.sid_color1}, 70%, 50%)` : null,
                color2: user.sid_color2 !== null ? `hsl(${user.sid_color2}, 70%, 50%)` : null,
                leftHz: user.sid_left_hz,
                rightHz: user.sid_right_hz,
                seed: user.sid_seed,
                createdAt: user.sid_created_at
            },
            // Stats
            stats: {
                regeneratedCount,
                sidVersion
            },
            // History for before/after comparison
            history: sidHistory.map(h => ({
                id: h.id,
                old_sid_id: h.old_sid_id,
                old_combo_id: h.old_combo_id,
                color1: h.color1 !== null ? `hsl(${h.color1}, 70%, 50%)` : '#333',
                color2: h.color2 !== null ? `hsl(${h.color2}, 70%, 50%)` : '#333',
                leftHz: h.leftHz,
                rightHz: h.rightHz,
                regeneratedAt: h.archivedAt,
                reason: h.reason || 'Regenerated'
            }))
        };

        return successResponse(res, 200, 'User details retrieved', data);
    } catch (error) {
        console.error('Get User Details Error:', error);
        return errorResponse(res, 500, 'Failed to fetch user details');
    }
};

/**
 * 9. SINAANK Live Monitor - Scaling Stats (Today/Yesterday)
 */
const getScalingStats = async (req, res) => {
    try {
        const { period } = req.query; // 'today' or 'yesterday'
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const range = period === 'yesterday' 
            ? { gte: yesterdayStart, lt: todayStart } 
            : { gte: todayStart };

        const [demo, payment, revenueData] = await Promise.all([
            // Demo Views
            prisma.systemLog.count({
                where: { actionType: 'DEMO_VIEWED', createdAt: range }
            }),
            // Successful Joins (Payments)
            prisma.paymentOrder.count({
                where: { status: 'PAID', createdAt: range }
            }),
            // Revenue
            prisma.paymentOrder.aggregate({
                _sum: { amount: true },
                where: { status: 'PAID', createdAt: range }
            })
        ]);

        const conversion = demo > 0 ? (payment / demo) * 100 : 0;
        const revenue = revenueData._sum.amount || 0;

        return successResponse(res, 200, 'Scaling stats retrieved', {
            demo,
            payment,
            conversion: parseFloat(conversion.toFixed(1)),
            revenue
        });
    } catch (error) {
        console.error('Get Scaling Stats Error:', error);
        return errorResponse(res, 500, 'Failed to fetch scaling stats');
    }
};

module.exports = {
    getDashboardStats,
    getScalingStats,
    getUsers,
    getUserDetails,
    blockUser,
    unblockUser,
    upgradeUser,
    getIncomeLedger,
    updateIncomeStatus,
    manualIncome,
    getTransactionLedger,
    manageMessages,
    getPayouts,
    updatePayoutStatus,
    getTherapyLogs,
    regenerateUserSID
};


