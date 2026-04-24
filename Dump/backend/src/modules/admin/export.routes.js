const express = require('express');
const router = express.Router();
const {
    exportTransactions,
    exportPayouts,
    exportBonusLedger,
    exportExpenses
} = require('./export.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Strict rate limit: Max 5 export requests per minute
const exportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many export requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(authMiddleware, requireAdmin, exportLimiter);

router.get('/transactions', exportTransactions);
router.get('/payouts', exportPayouts);
router.get('/bonus-ledger', exportBonusLedger);
router.get('/expenses', exportExpenses);

module.exports = router;
