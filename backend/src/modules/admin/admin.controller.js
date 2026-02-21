const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const getPendingPayouts = async (req, res) => {
    try {
        const payouts = await prisma.payout.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        mobile: true,
                        cid: true,
                        role: true
                    }
                }
            },
            orderBy: {
                requested_at: 'asc'
            }
        });

        return successResponse(res, 200, 'Pending payouts retrieved', payouts);
    } catch (error) {
        console.error('View Pending Payouts Error:', error);
        return errorResponse(res, 500, 'Failed to fetch payouts');
    }
};

const approvePayout = async (req, res) => {
    try {
        const payoutId = req.params.id; // String UUID because Payout.id was migrated to String UUID
        const adminId = req.user.id;

        // Verify payout and status
        const payout = await prisma.payout.findUnique({
            where: { id: payoutId }
        });

        if (!payout) {
            return errorResponse(res, 404, 'Payout not found');
        }

        if (payout.status !== 'PENDING') {
            return errorResponse(res, 400, `Cannot approve payout because it is already ${payout.status}`);
        }

        const payoutAmount = payout.amount;

        // Perform atomic transaction
        await prisma.$transaction(async (tx) => {
            // Revalidate Wallet Safety: Check balance > payoutAmount
            const currentWallet = await tx.walletCash.findUnique({
                where: { userId: payout.userId }
            });

            if (!currentWallet || currentWallet.balance < payoutAmount) {
                // Should realistically never happen unless manual db edit, but satisfies requirement #4
                throw new Error('Insufficient wallet balance to approve this payout');
            }

            // Deduct from wallet
            await tx.walletCash.update({
                where: { userId: payout.userId },
                data: { balance: { decrement: payoutAmount } }
            });

            // Create transaction history log (append only)
            await tx.transaction.create({
                data: {
                    userId: payout.userId,
                    type: 'PAYOUT',
                    amount: payoutAmount,
                    description: 'Withdrawal Approved',
                    status: 'COMPLETED'
                }
            });

            // Update payout status to APPROVED
            await tx.payout.update({
                where: { id: payout.id },
                data: {
                    status: 'APPROVED',
                    processed_at: new Date(),
                    processed_by: adminId,
                    remarks: req.body.remarks || 'Approved by Admin'
                }
            });

            // Log System Action
            await tx.systemLog.create({
                data: {
                    adminId: adminId,
                    actionType: 'APPROVE_PAYOUT',
                    targetUserId: payout.userId,
                    description: `Approved payout of ₹${payoutAmount} for user ${payout.userId}`
                }
            });
        });

        return successResponse(res, 200, 'Payout approved successfully');

    } catch (error) {
        console.error('Approve Payout Error:', error);
        // Distinguish business logic error from random 500
        if (error.message.includes('Insufficient wallet balance')) {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, 'Failed to approve payout', { message: error.message });
    }
};

const rejectPayout = async (req, res) => {
    try {
        const payoutId = req.params.id;
        const adminId = req.user.id;
        const { remarks } = req.body;

        if (!remarks) {
            return errorResponse(res, 400, 'Remarks are required when rejecting a payout');
        }

        const payout = await prisma.payout.findUnique({
            where: { id: payoutId }
        });

        if (!payout) {
            return errorResponse(res, 404, 'Payout not found');
        }

        if (payout.status !== 'PENDING') {
            return errorResponse(res, 400, `Cannot reject payout because it is already ${payout.status}`);
        }

        // Just update status, do NOT deduct wallet
        const updatedPayout = await prisma.payout.update({
            where: { id: payout.id },
            data: {
                status: 'REJECTED',
                processed_at: new Date(),
                processed_by: adminId,
                remarks: remarks
            }
        });

        await prisma.systemLog.create({
            data: {
                adminId,
                actionType: 'REJECT_PAYOUT',
                targetUserId: payout.userId,
                description: `Rejected payout of ₹${payout.amount}. Remarks: ${remarks}`
            }
        });

        return successResponse(res, 200, 'Payout rejected successfully', {
            status: updatedPayout.status,
            remarks: updatedPayout.remarks
        });

    } catch (error) {
        console.error('Reject Payout Error:', error);
        return errorResponse(res, 500, 'Failed to reject payout', { message: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                cash: true,
                minutes: true,
                ranks: { include: { rank: true } },
                _count: {
                    select: { referrals: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const safeUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            mobile: u.mobile,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt,
            walletCash: u.cash?.balance || 0,
            walletMinute: u.minutes?.balance || 0,
            ranks: u.ranks.map(r => r.rank.name),
            referralCount: u._count.referrals
        }));

        return successResponse(res, 200, 'Users retrieved', safeUsers);
    } catch (error) {
        console.error('Get Users Error:', error);
        return errorResponse(res, 500, 'Failed to fetch users');
    }
};

const blockUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { status: 'BLOCKED' }
        });

        await prisma.systemLog.create({
            data: {
                adminId,
                actionType: 'BLOCK_USER',
                targetUserId,
                description: `Blocked user ${updatedUser.mobile}`
            }
        });

        return successResponse(res, 200, 'User blocked successfully');
    } catch (error) {
        console.error('Block User Error:', error);
        return errorResponse(res, 500, 'Failed to block user');
    }
};

const unblockUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { status: 'ACTIVE' }
        });

        await prisma.systemLog.create({
            data: {
                adminId,
                actionType: 'UNBLOCK_USER',
                targetUserId,
                description: `Unblocked user ${updatedUser.mobile}`
            }
        });

        return successResponse(res, 200, 'User unblocked successfully');
    } catch (error) {
        console.error('Unblock User Error:', error);
        return errorResponse(res, 500, 'Failed to unblock user');
    }
};

const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const totalSeeders = await prisma.user.count({ where: { role: 'SEEDER' } });

        const cashAgg = await prisma.walletCash.aggregate({ _sum: { balance: true } });
        const pendingPayoutAgg = await prisma.payout.aggregate({
            where: { status: 'PENDING' },
            _sum: { amount: true }
        });
        const distributedPayoutAgg = await prisma.payout.aggregate({
            where: { status: 'APPROVED' },
            _sum: { amount: true }
        });
        const minutesAgg = await prisma.walletMinute.aggregate({ _sum: { balance: true } });

        const usedMinutesAgg = await prisma.transaction.aggregate({
            where: { type: 'MINUTE_DEDUCT' },
            _sum: { amount: true }
        });

        const stats = {
            total_users: totalUsers,
            total_seeders: totalSeeders,
            total_wallet_balance: cashAgg._sum.balance || 0,
            total_pending_payout: pendingPayoutAgg._sum.amount || 0,
            total_cash_distributed: distributedPayoutAgg._sum.amount || 0,
            total_minutes_balance: minutesAgg._sum.balance || 0,
            total_minutes_used: usedMinutesAgg._sum.amount || 0
        };

        return successResponse(res, 200, 'System stats retrieved', stats);
    } catch (error) {
        console.error('System Stats Error:', error);
        return errorResponse(res, 500, 'Failed to fetch system stats');
    }
};

module.exports = {
    getPendingPayouts,
    approvePayout,
    rejectPayout,
    getUsers,
    blockUser,
    unblockUser,
    getSystemStats
};
