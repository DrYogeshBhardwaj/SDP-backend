console.log("PAYMENT ROUTES LOADED");
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../modules/payment/payment.controller');

router.use((req, res, next) => {
    if (req.path === '/create-order' && req.method === 'POST') {
        console.log("CREATE ORDER HIT", req.body);
    }
    next();
});

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
