const express = require('express');
const router = express.Router();
const paymentController = require('../modules/payment/payment.controller');

router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.post('/verify-password', paymentController.verifyPasswordPayment);

module.exports = router;
