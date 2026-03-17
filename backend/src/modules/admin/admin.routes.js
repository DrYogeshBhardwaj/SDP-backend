const express = require('express');
const router = express.Router();
const { getPendingPayouts, approvePayout, rejectPayout, getUsers, blockUser, unblockUser, resetUserPin, editUser, trashUser, getTrashedUsers, restoreUser, purgeUser, getSystemStats, getLedger, getUserDetails } = require('./admin.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

// Very basic admin middleware for now
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Protect all admin routes
router.use(authMiddleware, requireAdmin);

router.get('/finance/payouts', getPendingPayouts);
router.post('/finance/payouts/:id/approve', approvePayout);
router.post('/finance/payouts/:id/reject', rejectPayout);

router.get('/users/trash', getTrashedUsers);
router.post('/users/:id/restore', restoreUser);
router.delete('/users/:id/purge', purgeUser);
router.get('/users', getUsers);
router.get('/users/:id/details', getUserDetails);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);
router.post('/users/:id/reset-pin', resetUserPin);
router.put('/users/:id', editUser);
router.delete('/users/:id/trash', trashUser);

router.get('/system/stats', getSystemStats);

router.get('/expense/ledger', getLedger);

module.exports = router;
