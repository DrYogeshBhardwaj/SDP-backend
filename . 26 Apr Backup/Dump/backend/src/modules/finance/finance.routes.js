const express = require('express');
const router = express.Router();
const { requestPayout, getPayoutSummary, approvePayout } = require('./finance.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { payoutLimiter } = require('../../middlewares/rateLimiter');

router.post('/request-payout', authMiddleware, payoutLimiter, requestPayout);
router.get('/payout-summary', authMiddleware, getPayoutSummary);
router.post('/approve-payout', authMiddleware, approvePayout); // Admin check normally here

module.exports = router;
