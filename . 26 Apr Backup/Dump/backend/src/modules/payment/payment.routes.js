const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('./payment.controller');
const { checkLimit } = require('../../middlewares/dbRateLimiter');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
