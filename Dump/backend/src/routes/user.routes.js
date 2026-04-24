const express = require('express');
const router = express.Router();
const userController = require('../modules/user/user.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Update UPI ID (Protected)
router.post('/update-upi', authMiddleware, userController.updateUpi);

module.exports = router;
