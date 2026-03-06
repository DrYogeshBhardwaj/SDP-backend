const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.post('/purchase', authMiddleware, productController.purchaseProduct);

module.exports = router;
