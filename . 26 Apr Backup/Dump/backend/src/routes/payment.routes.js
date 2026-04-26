const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');

// Clean Slate V1 Payment Routes
router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);

module.exports = router;
