const express = require('express');
const router = express.Router();
const { requestPayout } = require('./finance.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { payoutLimiter } = require('../../middlewares/rateLimiter');

router.post('/request-payout', authMiddleware, payoutLimiter, requestPayout);

module.exports = router;
