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
                        role: true,
                        upi_id: true
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
            // Confirm the lock via activePayoutId and clear it. Do not decrement balance again, it was deducted on request.
            await tx.walletCash.update({
                where: { userId: payout.userId },
                data: { activePayoutId: null }
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

        let updatedPayout;
        // Perform atomic transaction to refund the wallet and clear lock
        await prisma.$transaction(async (tx) => {
            // Update status
            updatedPayout = await tx.payout.update({
                where: { id: payout.id },
                data: {
                    status: 'REJECTED',
                    processed_at: new Date(),
                    processed_by: adminId,
                    remarks: remarks
                }
            });

            // Refund wallet
            await tx.walletCash.update({
                where: { userId: payout.userId },
                data: {
                    balance: { increment: payout.amount },
                    activePayoutId: null
                }
            });

            await tx.systemLog.create({
                data: {
                    adminId,
                    actionType: 'REJECT_PAYOUT',
                    targetUserId: payout.userId,
                    description: `Rejected payout of ₹${payout.amount}. Remarks: ${remarks}`
                }
            });
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
            where: {
                mobile: { not: { startsWith: 'TRASHED_' } }
            },
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

const resetUserPin = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const pin_hash = await bcrypt.hash('1234', salt);

        await prisma.user.update({
            where: { id: targetUserId },
            data: { pin_hash }
        });

        await prisma.systemLog.create({
            data: { adminId, actionType: 'RESET_PIN', targetUserId, description: `Reset PIN to 1234 for user id: ${targetUserId}` }
        });

        return successResponse(res, 200, 'PIN reset to 1234 successfully');
    } catch (error) {
        console.error('Reset PIN Error:', error);
        return errorResponse(res, 500, 'Failed to reset PIN');
    }
};

const editUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;
        const { name } = req.body;

        await prisma.user.update({
            where: { id: targetUserId },
            data: { name }
        });

        await prisma.systemLog.create({
            data: { adminId, actionType: 'EDIT_USER', targetUserId, description: `Updated user name to ${name}` }
        });

        return successResponse(res, 200, 'User updated successfully');
    } catch (error) {
        console.error('Edit User Error:', error);
        return errorResponse(res, 500, 'Failed to update user details');
    }
};

const trashUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;

        // Note: For real soft-delete, we repurpose status as we did in V1, or we can use another field.
        // For now, let's use the 'status' or add a safe block pattern that removes UI access.
        // Actually, we'll prefix mobile to break auth, and status=BLOCKED
        const userToTrash = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!userToTrash) return errorResponse(res, 404, 'User not found');

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                status: 'BLOCKED',
                mobile: `TRASHED_${Date.now()}_${userToTrash.mobile}` // breaks login entirely
            }
        });

        await prisma.systemLog.create({
            data: {
                adminId,
                actionType: 'TRASH_USER',
                targetUserId,
                description: `Soft-deleted user ${userToTrash.mobile}`
            }
        });

        return successResponse(res, 200, 'User moved to trash successfully');
    } catch (error) {
        console.error('Trash User Error:', error);
        return errorResponse(res, 500, 'Failed to trash user');
    }
};

const getTrashedUsers = async (req, res) => {
    try {
        const trashedUsers = await prisma.user.findMany({
            where: {
                mobile: { startsWith: 'TRASHED_' }
            },
            select: { id: true, mobile: true, role: true, status: true, updatedAt: true }
        });

        // Strip the TRASHED_timestamp_ logic to clean up the view
        const cleanUsers = trashedUsers.map(u => {
            const parts = u.mobile.split('_');
            const originalMobile = parts.length >= 3 ? parts.slice(2).join('_') : u.mobile;
            return {
                id: u.id,
                mobile: isNaN(Number(originalMobile)) ? originalMobile : originalMobile,
                rawMobile: u.mobile, // Keep original to target them for total purge if needed
                role: u.role,
                status: u.status,
                deletedAt: u.updatedAt
            };
        });

        return successResponse(res, 200, 'Trashed users retrieved', cleanUsers);
    } catch (error) {
        console.error('Get Trash Error:', error);
        return errorResponse(res, 500, 'Failed to retrieve trashed users');
    }
};

const restoreUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;

        const userToRestore = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!userToRestore || !userToRestore.mobile.startsWith('TRASHED_')) {
            return errorResponse(res, 400, 'User is not in trash or not found');
        }

        const parts = userToRestore.mobile.split('_');
        const originalMobile = parts.length >= 3 ? parts.slice(2).join('_') : userToRestore.mobile;

        // Check if the original mobile is already taken by a new signup
        const existing = await prisma.user.findFirst({
            where: { mobile: originalMobile }
        });

        if (existing) {
            return errorResponse(res, 400, 'Cannot restore user. The mobile number has already been registered by another account.');
        }

        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                status: 'ACTIVE',
                mobile: originalMobile
            }
        });

        await prisma.systemLog.create({
            data: {
                adminId,
                actionType: 'RESTORE_USER',
                targetUserId,
                description: `Restored user ${originalMobile} from trash`
            }
        });

        return successResponse(res, 200, 'User restored successfully');
    } catch (error) {
        console.error('Restore User Error:', error);
        return errorResponse(res, 500, 'Failed to restore user');
    }
};

const purgeUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const adminId = req.user.id;

        const userToPurge = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!userToPurge || !userToPurge.mobile.startsWith('TRASHED_')) {
            return errorResponse(res, 400, 'User is not in trash or not found');
        }

        // Permanently delete user and potentially all related records.
        // Prisma cascade delete should handle most of this if foreign keys are set to ON DELETE CASCADE,
        // otherwise we use transaction to delete related records first.

        await prisma.$transaction(async (tx) => {
            // Assume schema has necessary cascades, but manually delete wallets to be safe if strictly required.
            // If there's an issue with missing cascades, we might need manual deletions here.
            // Since User -> WalletCash/WalletMinute is 1:1, usually cascade handles it.
            await tx.walletCash.deleteMany({ where: { userId: targetUserId } });
            await tx.walletMinute.deleteMany({ where: { userId: targetUserId } });
            await tx.bonusLedger.deleteMany({ where: { userId: targetUserId } });
            // Remove referrals where they are the referred
            await tx.referral.deleteMany({ where: { referredUserId: targetUserId } });
            // Or where they are the referrer
            await tx.referral.deleteMany({ where: { referrerId: targetUserId } });
            await tx.payout.deleteMany({ where: { userId: targetUserId } });
            await tx.transaction.deleteMany({ where: { userId: targetUserId } });

            // Re-assign family members to null if they are owner
            await tx.user.updateMany({
                where: { familyOwnerId: targetUserId },
                data: { familyOwnerId: null }
            });

            await tx.user.delete({ where: { id: targetUserId } });

            await tx.systemLog.create({
                data: {
                    adminId,
                    actionType: 'PURGE_USER',
                    targetUserId,
                    description: `Permanently deleted user ${userToPurge.mobile}`
                }
            });
        });

        return successResponse(res, 200, 'User permanently deleted');
    } catch (error) {
        console.error('Purge User Error:', error);
        return errorResponse(res, 500, 'Failed to permanently delete user', { message: error.message });
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

        const pendingPayoutCount = await prisma.payout.count({ where: { status: 'PENDING' } });
        const unreadMessagesCount = await prisma.message.count({ where: { receiverId: req.user.id, status: 'UNREAD' } });

        const stats = {
            total_users: totalUsers,
            total_seeders: totalSeeders,
            total_wallet_balance: cashAgg._sum.balance || 0,
            total_pending_payout: pendingPayoutAgg._sum.amount || 0,
            pending_payout_count: pendingPayoutCount,
            unread_messages_count: unreadMessagesCount,
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

const getLedger = async (req, res) => {
    try {
        // Fetch all PURCHASE transactions (Admin Credit)
        const purchases = await prisma.transaction.findMany({
            where: { type: 'PURCHASE', status: 'COMPLETED' },
            include: { user: { select: { mobile: true } } },
            orderBy: { transactionDate: 'desc' },
            take: 50
        });

        // Fetch all BONUS assignments (Admin Debit Liability)
        const bonuses = await prisma.bonusLedger.findMany({
            include: { user: { select: { mobile: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Fetch all APPROVED Payouts (Admin Actual Debit)
        const payouts = await prisma.payout.findMany({
            where: { status: 'APPROVED' },
            include: { user: { select: { mobile: true } } },
            orderBy: { processed_at: 'desc' },
            take: 50
        });

        const records = [];

        purchases.forEach(p => {
            records.push({
                createdAt: p.transactionDate,
                type: 'PURCHASE (Credit)',
                amount: p.amount,
                description: `Payment from ${p.user?.mobile || 'User'}`
            });
        });

        bonuses.forEach(b => {
            records.push({
                createdAt: b.createdAt,
                type: 'REFERRAL BONUS (Debit Liability)',
                amount: `-${b.amount}`,
                description: `Owed to Seeder ${b.user?.mobile || 'User'}`
            });
        });

        payouts.forEach(p => {
            records.push({
                createdAt: p.processed_at || p.requested_at,
                type: 'PAYOUT (Actual Debit)',
                amount: `-${p.amount}`,
                description: `Paid to Seeder ${p.user?.mobile || 'User'}`
            });
        });

        // Sort by date descending
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Calculate total liability (Sum of all wallet cash)
        const cashAgg = await prisma.walletCash.aggregate({ _sum: { balance: true } });
        const totalLiability = cashAgg._sum.balance || 0;

        return successResponse(res, 200, 'Ledger retrieved', { records, totalLiability });
    } catch (error) {
        console.error('Ledger Error:', error);
        return errorResponse(res, 500, 'Failed to retrieve ledger');
    }
};

const getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                cash: true,
                _count: {
                    select: {
                        referrals: true
                    }
                }
            }
        });

        if (!user) return errorResponse(res, 404, 'User not found');

        // Level 1 explicitly active
        const level1Count = await prisma.referral.count({
            where: { referrerId: userId, level: 1 }
        });

        const level2Count = await prisma.referral.count({
            where: { referrerId: userId, level: 2 }
        });

        // 10 latest bonus ledger entries
        const latestBonuses = await prisma.bonusLedger.findMany({
            where: { userId: userId },
            include: {
                sourceUser: {
                    select: { mobile: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return successResponse(res, 200, 'User details retrieved', {
            info: {
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                status: user.status,
                joinedAt: user.createdAt,
            },
            wallet: user.cash?.balance || 0,
            network: {
                level1: level1Count,
                level2: level2Count,
                total: user._count.referrals
            },
            recentBonuses: latestBonuses.map(b => ({
                amount: Math.abs(b.amount),
                type: b.type,
                date: b.createdAt,
                sourceMobile: b.sourceUser?.mobile || 'System'
            }))
        });

    } catch (error) {
        console.error('Get User Details Error:', error);
        return errorResponse(res, 500, 'Failed to fetch user details');
    }
};

module.exports = {
    getPendingPayouts,
    approvePayout,
    rejectPayout,
    getUsers,
    blockUser,
    unblockUser,
    resetUserPin,
    editUser,
    trashUser,
    getTrashedUsers,
    restoreUser,
    purgeUser,
    getSystemStats,
    getLedger,
    getUserDetails
};
