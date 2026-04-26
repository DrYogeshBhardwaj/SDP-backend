const express = require('express');
const router = express.Router();
const paymentController = require('../modules/payment/payment.controller');

const { authMiddleware: auth } = require('../middlewares/authMiddleware');


router.post('/create-order', (req, res, next) => {
    if (req.headers.authorization) return auth(req, res, next);
    next();
}, paymentController.createOrder);

router.post('/simulate-success', auth, paymentController.simulateSuccess);
router.post('/verify-payment', paymentController.verifyPayment);
router.post('/verify-password', paymentController.verifyPasswordPayment);

module.exports = router;

