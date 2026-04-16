const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../modules/payment/payment.controller');

router.get('/create-order', (req, res) => {
    return res.json({
        success: true,
        message: "GET route working"
    });
});

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

console.log("/api/payment route loaded");
module.exports = router;
