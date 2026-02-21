const express = require('express');
const router = express.Router();
const { createExpense, getExpenses } = require('./expense.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Protect all routes with JWT and Admin checks
router.use(authMiddleware, requireAdmin);

router.post('/', createExpense);
router.get('/', getExpenses);

module.exports = router;
