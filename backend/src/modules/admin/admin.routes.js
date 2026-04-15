const express = require('express');
const router = express.Router();
const { 
    getDashboardStats, 
    getUsers, 
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
    getUserDetails,
    regenerateUserSID
} = require('./admin.controller');
const { logDemoStart, getDailyReportStats, getScalingStats } = require('./stats.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Public Stats (Anonymous)
router.post('/stats/log-demo', logDemoStart);

// Protect all admin routes
router.use(authMiddleware, requireAdmin);

// 1. Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/stats', getScalingStats); // Scaling Monitor specific API

// 2. Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);
router.post('/users/:id/upgrade', upgradeUser);
router.post('/users/:id/regenerate-sid', regenerateUserSID);

// 3. Income
router.get('/income/ledger', getIncomeLedger);
router.post('/income/:id/status', updateIncomeStatus);
router.post('/income/manual', manualIncome);

// 4. Transactions
router.get('/transactions/ledger', getTransactionLedger);

// 5. Messages
router.post('/messages/send', manageMessages);

// 6. Payouts
router.get('/payouts', getPayouts);
router.post('/payouts/:id/status', updatePayoutStatus);

// 7. Therapy
router.get('/therapy/logs', getTherapyLogs);

// 8. Daily Analytics (Internal Tool)
router.get('/stats/report', getDailyReportStats);




module.exports = router;

