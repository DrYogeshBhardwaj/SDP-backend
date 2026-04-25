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

        // 1. Total In (Revenue)
        const revenueAgg = await prisma.transaction.aggregate({
            where: { category: 'REGISTRATION_FEE' },
            _sum: { amount: true }
        });
        const totalIn = revenueAgg._sum.amount || 0;

        // 2. Today's In
        const todayReceipts = await prisma.transaction.findMany({
            where: { 
                category: 'REGISTRATION_FEE',
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

        // 5. System Alerts (Gadbad Detection)
        const alerts = [];
        const negativeWallets = wallets.filter(w => w.balance < 0);
        if (negativeWallets.length > 0) {
            alerts.push({
                type: 'CRITICAL',
                message: `${negativeWallets.length} users have negative balances (ILLegal).`
            });
        }

        // Quick Audit: Total In SHOULD be >= Total Out + Total Liability
        // (Revenue >= Paid + Owed)
        if (totalIn < (totalOut + totalLiability)) {
            alerts.push({
                type: 'WARNING',
                message: `Audit Mismatch: Distributed commissions (${totalOut + totalLiability} exceeds Total Revenue (${totalIn}).`
            });
        }

        const recentTransactions = await prisma.transaction.count({
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
            include: { wallets: true },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, 200, 'User List', users);
    } catch (err) {
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
            include: { user: { select: { mobile: true } } }
        });
        return successResponse(res, 200, 'Cash Logs', logs);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch logs');
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, name, minutesBalance, role, upiId } = req.body;

        console.log(`[ADMIN_UPDATE] Updating user ${id}:`, { name, status, role, minutesBalance, upiId });

        const updated = await prisma.user.update({
            where: { id },
            data: { 
                status, 
                name, 
                minutesBalance: parseInt(minutesBalance) || 0, 
                role,
                upiId
            }
        });

        return successResponse(res, 200, 'User updated', updated);
    } catch (err) {
        console.error('[ADMIN_UPDATE_ERROR]', err);
        return errorResponse(res, 500, 'Update failed');
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

            const { generateToken } = require('../../utils/jwt');
            const token = generateToken({ userId: admin.id });

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
    createManualPayout
};
