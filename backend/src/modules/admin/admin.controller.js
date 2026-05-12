const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const axios = require('axios');


/**
 * V1 Admin Controller (Rebirth)
 */

const getStats = async (req, res) => {
    console.log(`[ADMIN_STATS_FETCH] Request from Admin ID: ${req.user.userId}`);
    try {
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { status: 'ACTIVE' } });
        
        // Wholesale Metrics
        const today = new Date();
        today.setHours(0,0,0,0);

        // 1. Total In (Revenue - Consolidated)
        // We look for both legacy REGISTRATION_FEE and new PLAN_UPGRADE
        const revenueAgg = await prisma.transaction.aggregate({
            where: { 
                category: { in: ['REGISTRATION_FEE', 'PLAN_UPGRADE'] },
                type: 'CREDIT' 
            },
            _sum: { amount: true }
        });
        const totalIn = revenueAgg._sum.amount || 0;

        // 2. Today's In
        const todayReceipts = await prisma.transaction.findMany({
            where: { 
                category: { in: ['REGISTRATION_FEE', 'PLAN_UPGRADE'] },
                type: 'CREDIT',
                createdAt: { gte: today }
            }
        });
        const todayIn = todayReceipts.reduce((acc, r) => acc + r.amount, 0);

        // 3. Total Out (Paid Payouts)
        const paidAgg = await prisma.payout.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });
        const totalOut = paidAgg._sum.amount || 0;

        // 4. Total Liability (Current Wallets)
        const wallets = await prisma.wallet.findMany({ where: { type: 'CASH' } });
        const totalLiability = wallets.reduce((acc, w) => acc + w.balance, 0);

        // 5. System Alerts (Audit)
        const alerts = [];
        const negativeWallets = wallets.filter(w => w.balance < 0);
        if (negativeWallets.length > 0) {
            alerts.push({
                type: 'CRITICAL',
                message: `${negativeWallets.length} users have negative balances.`
            });
        }

        // Audit: Total In SHOULD be >= Total Out + Total Liability
        // We also check for users who are PAID but have no revenue record
        const paidUsers = await prisma.user.findMany({
            where: { plan: 'PREMIUM' },
            include: { transactions: { where: { category: 'PLAN_UPGRADE' } } }
        });
        const usersMissingRevenue = paidUsers.filter(u => u.transactions.length === 0);
        if (usersMissingRevenue.length > 0) {
            alerts.push({
                type: 'WARNING',
                message: `${usersMissingRevenue.length} Premium users missing revenue records.`
            });
        }

        if (totalIn < (totalOut + totalLiability)) {
            alerts.push({
                type: 'WARNING',
                message: `Audit Mismatch: Distributed commissions (${totalOut + totalLiability}) exceeds Total Revenue (${totalIn}).`
            });
        }

        const recentTransactions = await prisma.transaction.count({
            where: { createdAt: { gte: today } }
        });

        // Today's New Users
        const todayUsers = await prisma.user.count({
            where: { createdAt: { gte: today } }
        });

        // Today's Visits
        const todayVisits = await prisma.siteVisit.count({
            where: { createdAt: { gte: today } }
        });

        return successResponse(res, 200, 'Admin Stats', {
            wholesale: {
                totalUsers,
                activeUsers,
                totalIn,
                todayIn,
                totalOut,
                totalLiability,
                recentTransactions,
                todayUsers,
                todayVisits,
                alerts
            }
        });
    } catch (err) {
        console.error('[ADMIN_STATS_ERROR]', err);
        return errorResponse(res, 500, 'Failed to fetch stats');
    }
};

const getPendingBalances = async (req, res) => {
    try {
        const pending = await prisma.wallet.findMany({
            where: { 
                type: 'CASH',
                balance: { gt: 0 }
            },
            include: { user: { select: { id: true, mobile: true, name: true, upiId: true } } },
            orderBy: { balance: 'desc' }
        });
        return successResponse(res, 200, 'Pending Balances', pending);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch pending balances');
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { 
                wallets: true,
                sponsor: { select: { mobile: true } },
                transactions: {
                    where: { category: 'BONUS' },
                    select: { amount: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate total earnings for each user
        const usersWithEarnings = users.map(u => {
            const earnings = u.transactions.reduce((acc, t) => acc + t.amount, 0);
            const { transactions, ...userWithoutTxs } = u;
            return { ...userWithoutTxs, totalEarnings: earnings };
        });

        return successResponse(res, 200, 'User List', usersWithEarnings);
    } catch (err) {
        console.error('[GET_ALL_USERS_ERR]', err);
        return errorResponse(res, 500, 'Failed to fetch users');
    }
};

const getPayouts = async (req, res) => {
    try {
        const payouts = await prisma.payout.findMany({
            include: { user: { select: { mobile: true, name: true, upiId: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, 200, 'Payout List', payouts);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch payouts');
    }
};

const processPayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, transactionId } = req.body;

        // 1. Fetch payout to check current status and amount
        const payout = await prisma.payout.findUnique({ where: { id } });
        if (!payout) return errorResponse(res, 404, 'Payout not found');

        // 2. If Rejecting, refund the user's wallet
        if (status === 'REJECTED' && payout.status !== 'REJECTED') {
            await prisma.$transaction([
                prisma.payout.update({
                    where: { id },
                    data: { status, processedAt: new Date() }
                }),
                prisma.wallet.updateMany({
                    where: { userId: payout.userId, type: 'CASH' },
                    data: { balance: { increment: payout.amount } }
                }),
                prisma.transaction.create({
                    data: {
                        userId: payout.userId,
                        amount: payout.amount,
                        type: 'CREDIT',
                        category: 'BONUS',
                        description: `REFUND: Payout of ₹${payout.amount} was rejected.`
                    }
                })
            ]);
            return successResponse(res, 200, 'Payout rejected and amount refunded.');
        }

        // 3. Normal update (Approve, Paid, etc)
        const updated = await prisma.payout.update({
            where: { id },
            data: { 
                status, 
                transactionId,
                processedAt: status === 'PAID' ? new Date() : undefined
            }
        });

        return successResponse(res, 200, `Payout marked as ${status}`, updated);
    } catch (err) {
        console.error('[ADMIN_PAYOUT_ERR]', err);
        return errorResponse(res, 500, 'Failed to process payout');
    }
};

const getQueries = async (req, res) => {
    try {
        const queries = await prisma.supportQuery.findMany({
            include: { user: { select: { mobile: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, 200, 'Query List', queries);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch queries');
    }
};

const getCashLogs = async (req, res) => {
    try {
        const logs = await prisma.transaction.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { mobile: true, name: true } } }
        });
        return successResponse(res, 200, 'Cash Logs', logs);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch logs');
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, name, minutesBalance, role, upiId, sponsorMobile, plan, isBusinessUnlocked } = req.body;

        console.log(`[ADMIN_UPDATE] Updating user ${id}:`, { name, status, role, minutesBalance, upiId, sponsorMobile, plan, isBusinessUnlocked });

        let sponsorId = undefined;
        if (sponsorMobile) {
            const sponsor = await prisma.user.findUnique({ where: { mobile: sponsorMobile } });
            if (!sponsor) return errorResponse(res, 404, 'New Sponsor not found');
            sponsorId = sponsor.id;
        }

        // Strict type casting for boolean/int
        const dataToUpdate = {
            status,
            name,
            role,
            upiId,
            sponsorId,
            plan: plan || undefined,
            minutesBalance: minutesBalance !== undefined ? parseInt(minutesBalance) : undefined,
            isBusinessUnlocked: isBusinessUnlocked === true || isBusinessUnlocked === 'true' ? true : (isBusinessUnlocked === false || isBusinessUnlocked === 'false' ? false : undefined)
        };

        const updated = await prisma.user.update({
            where: { id },
            data: dataToUpdate
        });

        // If downgrading to FREE, we should also remove the revenue record and revert commissions
        let revenueCleaned = false;
        let commissionsReverted = 0;

        if (plan === 'FREE') {
            // 1. Delete Revenue Records (Both V1 and Legacy)
            const deletedRev = await prisma.transaction.deleteMany({
                where: { 
                    userId: id, 
                    category: { in: ['PLAN_UPGRADE', 'REGISTRATION_FEE'] }
                }
            });
            if (deletedRev.count > 0) revenueCleaned = true;

            // 2. Find and Revert Commissions (BONUS records where this user was the source)
            const bonuses = await prisma.transaction.findMany({
                where: { fromUserId: id, category: 'BONUS' }
            });

            for (const bonus of bonuses) {
                // Deduct from upline's wallet
                await prisma.wallet.updateMany({
                    where: { userId: bonus.userId, type: 'CASH' },
                    data: { balance: { decrement: bonus.amount } }
                });
                // Delete the bonus record
                await prisma.transaction.delete({ where: { id: bonus.id } });
                commissionsReverted++;
            }
        }

        // Log the change
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await prisma.securityLog.create({
            data: {
                event: 'ADMIN_USER_UPDATE',
                details: `Admin updated user ${updated.mobile}. Plan: ${updated.plan}. Revenue Deleted: ${revenueCleaned}. Commissions Reverted: ${commissionsReverted}. IP: ${ip}`,
                ip
            }
        });

        return successResponse(res, 200, `User updated. ${revenueCleaned ? 'Revenue cleared. ' : ''}${commissionsReverted > 0 ? commissionsReverted + ' commissions reverted.' : ''}`, updated);

    } catch (err) {
        console.error('[ADMIN_UPDATE_ERROR]', err);
        return errorResponse(res, 500, 'Update failed: ' + err.message);
    }
};

const manualUpgrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { distributeCommissions } = require('../payment/payment.controller');
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 1. Fetch User
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return errorResponse(res, 404, 'User not found');
        if (user.plan === 'PREMIUM') return errorResponse(res, 400, 'User is already PREMIUM');

        // 2. Perform Atomic Upgrade
        const updated = await prisma.$transaction([
            // Update User Stats
            prisma.user.update({
                where: { id },
                data: {
                    plan: 'PREMIUM',
                    isBusinessUnlocked: true,
                    minutesBalance: 3600
                }
            }),
            // Record Revenue (Admin Collected)
            prisma.transaction.create({
                data: {
                    userId: id,
                    amount: 299,
                    type: 'CREDIT',
                    category: 'PLAN_UPGRADE',
                    description: `Manual Upgrade by Admin (Cash Collected). IP: ${ip}`
                }
            }),
            // Log Security
            prisma.securityLog.create({
                data: {
                    event: 'ADMIN_MANUAL_UPGRADE',
                    details: `Admin manually upgraded user ${user.mobile}. Commission distributed. IP: ${ip}`,
                    ip
                }
            })
        ]);

        // 3. Trigger Commissions (The Soul of the System)
        await distributeCommissions(id, 299, user.mobile);

        return successResponse(res, 200, 'User upgraded to PREMIUM successfully. Commissions distributed.', updated[0]);
    } catch (err) {
        console.error('[ADMIN_UPGRADE_ERROR]', err);
        return errorResponse(res, 500, 'Upgrade failed: ' + err.message);
    }
};

const updateQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, response } = req.body;

        const updated = await prisma.supportQuery.update({
            where: { id },
            data: { status, response }
        });

        return successResponse(res, 200, 'Query updated', updated);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to update query');
    }
};

const sweepToPayouts = async (req, res) => {
    try {
        // 1. Find users with CASH balance > 0 and UPI ID set
        const wallets = await prisma.wallet.findMany({
            where: {
                type: 'CASH',
                balance: { gt: 0 },
                user: { upiId: { not: null, not: '' } }
            },
            include: { user: { select: { id: true, mobile: true } } }
        });

        if (wallets.length === 0) {
            return successResponse(res, 200, 'No eligible balances to sweep.');
        }

        let processedCount = 0;
        let totalAmount = 0;

        // 2. Process each wallet (Sequential for safety, could be bulked later)
        for (const wallet of wallets) {
            const amount = wallet.balance;
            const userId = wallet.user.id;

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: 0 } // Sweep full balance
                }),
                prisma.payout.create({
                    data: {
                        userId,
                        amount,
                        status: 'PENDING'
                    }
                }),
                prisma.transaction.create({
                    data: {
                        userId,
                        amount,
                        type: 'DEBIT',
                        category: 'PAYOUT_REQUEST',
                        description: `Auto-Sweep: Full balance payout ₹${amount}`
                    }
                })
            ]);
            processedCount++;
            totalAmount += amount;
        }

        return successResponse(res, 201, `Successfully swept ₹${totalAmount} from ${processedCount} users into Payout records.`);
    } catch (err) {
        console.error('[SWEEP_ERROR]', err);
        return errorResponse(res, 500, 'Failed to sweep balances');
    }
};

const getNetworkTree = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { 
                id: true, 
                mobile: true, 
                name: true, 
                sponsorId: true,
                role: true,
                createdAt: true
            }
        });
        return successResponse(res, 200, 'Network Tree Data', users);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch network tree');
    }
};

const getSystemConfig = async (req, res) => {
    try {
        const configs = await prisma.systemConfig.findMany();
        return successResponse(res, 200, 'System Config', configs);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch config');
    }
};

const createManualPayout = async (req, res) => {
    try {
        const { mobile, amount } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!mobile || !amount || amount <= 0) return errorResponse(res, 400, 'Invalid Mobile or Amount');

        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) return errorResponse(res, 404, 'User not found');

        // Check if user has enough balance (Optional: Admin can override, so we just log it)
        const wallet = await prisma.wallet.findFirst({ where: { userId: user.id, type: 'CASH' } });
        const balance = wallet ? wallet.balance : 0;

        const payout = await prisma.$transaction([
            // Deduct from wallet
            prisma.wallet.updateMany({
                where: { userId: user.id, type: 'CASH' },
                data: { balance: { decrement: parseFloat(amount) } }
            }),
            // Create Payout Record
            prisma.payout.create({
                data: {
                    userId: user.id,
                    amount: parseFloat(amount),
                    status: 'PENDING'
                }
            }),
            // Log Transaction
            prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: parseFloat(amount),
                    type: 'DEBIT',
                    category: 'PAYOUT_REQUEST',
                    description: `Manual Admin Payout: ₹${amount}`
                }
            }),
            // Log Security
            prisma.securityLog.create({
                data: {
                    event: 'MANUAL_PAYOUT_CREATED',
                    details: `Admin created manual payout of ₹${amount} for ${mobile}. IP: ${ip}`,
                    ip
                }
            })
        ]);

        return successResponse(res, 201, 'Manual Payout Created', payout[1]);
    } catch (err) {
        console.error('[MANUAL_PAYOUT_ERR]', err);
        return errorResponse(res, 500, 'Failed to create manual payout');
    }
};

const updateSystemConfig = async (req, res) => {

    try {
        const { key, value } = req.body;
        const config = await prisma.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        return successResponse(res, 200, 'Config updated', config);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to update config');
    }
};

const verifyMasterPass = async (req, res) => {
    try {
        const { password } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const config = await prisma.systemConfig.findUnique({ where: { key: 'ADMIN_MASTER_PASS' } });
        
        // Fallback to initial password if not set in DB yet
        const masterPass = config ? config.value : '725653A';
        
        if (password === masterPass) {
            // Log Key Success
            await prisma.securityLog.create({
                data: {
                    event: 'ADMIN_KEY_SUCCESS',
                    details: `Master Key verified. Triggering MFA OTP to Admin. IP: ${ip}`,
                    ip
                }
            });

            // TRIGGER OTP TO ADMIN (9211755211)
            const mobile = '9211755211';
            const apiKey = process.env.TWO_FACTOR_API_KEY;
            const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN/MKUNDLI_OTP`;

            const response = await axios.get(url);
            
            if (response.data.Status === "Success") {
                return successResponse(res, 200, 'Master Key Valid. OTP Sent.', { 
                    mfaRequired: true, 
                    sessionId: response.data.Details 
                });
            } else {
                return errorResponse(res, 500, 'MFA OTP Gateway failed. Try again.');
            }

        } else {
            // Log Failure
            await prisma.securityLog.create({
                data: {
                    event: 'ADMIN_LOGIN_FAILURE',
                    details: `Incorrect Master Password attempt: ${password}. IP: ${ip}`,
                    ip
                }
            });
            return errorResponse(res, 401, 'Invalid Master Key');
        }
    } catch (err) {
        console.error('[MASTER_VERIFY_ERROR]', err);
        return errorResponse(res, 500, 'Verification failed');
    }
};

const verifyAdminMFA = async (req, res) => {
    try {
        const { sessionId, otp } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!sessionId || !otp) return errorResponse(res, 400, 'SessionId and OTP required');

        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;

        const response = await axios.get(url);

        if (response.data.Status === "Success") {
            // FIND THE ADMIN USER
            const admin = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
            if (!admin) return errorResponse(res, 404, 'Admin Identity missing. Run restore script.');

            // Log Success
            await prisma.securityLog.create({
                data: { event: 'ADMIN_MFA_SUCCESS', details: `MFA Verified. Login complete. IP: ${ip}`, ip }
            });

            // 2. Generate Session ID for Single-Device Logic
            const crypto = require('crypto');
            const sid = crypto.randomUUID();

            // 3. Update Admin with new Session ID
            await prisma.user.update({
                where: { id: admin.id },
                data: { activeSessionId: sid }
            });

            const { generateToken } = require('../../utils/jwt');
            const token = generateToken({ userId: admin.id, sid });

            return successResponse(res, 200, 'Access Granted', { token });
        } else {
             // Log MFA Failure
             await prisma.securityLog.create({
                data: { event: 'ADMIN_MFA_FAILURE', details: `Invalid Admin OTP attempt: ${otp}. IP: ${ip}`, ip }
            });
            return errorResponse(res, 400, 'Invalid Admin OTP');
        }
    } catch (err) {
        console.error('[ADMIN_MFA_ERR]', err.response?.data || err.message);
        return errorResponse(res, 400, 'MFA Verification failed');
    }
};


const getSecurityLogs = async (req, res) => {
    try {
        const logs = await prisma.securityLog.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, 200, 'Security Logs', logs);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch security logs');
    }
};


const getAnalytics = async (req, res) => {
    try {
        const totalVisits = await prisma.siteVisit.count();
        
        // Today's visits
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayVisits = await prisma.siteVisit.count({
            where: { createdAt: { gte: today } }
        });

        // Group by Referrer
        const referrers = await prisma.siteVisit.groupBy({
            by: ['referrer'],
            _count: { referrer: true },
            orderBy: { _count: { referrer: 'desc' } },
            take: 10
        });

        // Group by Page
        const pages = await prisma.siteVisit.groupBy({
            by: ['page'],
            _count: { page: true },
            orderBy: { _count: { page: 'desc' } },
            take: 10
        });

        // Group by Location (City/Country)
        // Since we can't easily groupBy multiple fields and format, let's group by Country first
        const countries = await prisma.siteVisit.groupBy({
            by: ['country', 'city'],
            _count: { _all: true },
            orderBy: { _count: { country: 'desc' } },
            take: 10
        });

        return successResponse(res, 200, 'Analytics Data', {
            totalVisits,
            todayVisits,
            topReferrers: referrers.map(r => ({ referrer: r.referrer, count: r._count.referrer })),
            topPages: pages.map(p => ({ page: p.page, count: p._count.page })),
            topLocations: countries.map(c => ({ 
                location: `${c.city !== 'Unknown' && c.city ? c.city + ', ' : ''}${c.country || 'Unknown'}`, 
                count: c._count._all 
            }))
        });
    } catch (err) {
        console.error('[ADMIN_ANALYTICS_ERROR]', err);
        return errorResponse(res, 500, 'Failed to fetch analytics');
    }
};

const transferCommission = async (req, res) => {
    try {
        const { fromMobile, toMobile, amount, reason } = req.body;
        console.log(`[ADMIN_TRANSFER] From: ${fromMobile}, To: ${toMobile}, Amount: ${amount}`);

        const fromUser = await prisma.user.findUnique({ where: { mobile: fromMobile } });
        const toUser = await prisma.user.findUnique({ where: { mobile: toMobile } });

        if (!fromUser || !toUser) {
            return errorResponse(res, 404, 'One or both sponsors not found');
        }

        await prisma.$transaction([
            // 1. Deduct from OLD
            prisma.wallet.updateMany({
                where: { userId: fromUser.id, type: 'CASH' },
                data: { balance: { decrement: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId: fromUser.id,
                    amount: amount,
                    type: 'DEBIT',
                    category: 'BONUS',
                    description: `COMMISSION REVERSAL: ${reason || 'Sponsor Change'}`
                }
            }),
            // 2. Credit to NEW
            prisma.wallet.updateMany({
                where: { userId: toUser.id, type: 'CASH' },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId: toUser.id,
                    amount: amount,
                    type: 'CREDIT',
                    category: 'BONUS',
                    description: `COMMISSION TRANSFER: ${reason || 'Sponsor Change'}`
                }
            })
        ]);

        return successResponse(res, 200, 'Commission Transferred Successfully');
    } catch (err) {
        console.error('[ADMIN_TRANSFER_ERROR]', err);
        return errorResponse(res, 500, 'Transfer failed');
    }
};

module.exports = { 
    getStats, 
    getAllUsers, 
    getCashLogs, 
    updateUser, 
    getPayouts, 
    processPayout, 
    getQueries, 
    updateQuery,
    getPendingBalances,
    sweepToPayouts,
    getNetworkTree,
    getSystemConfig,
    updateSystemConfig,
    verifyMasterPass,
    getSecurityLogs,
    verifyAdminMFA,
    createManualPayout,
    manualUpgrade,
    getAnalytics,
    transferCommission
};
