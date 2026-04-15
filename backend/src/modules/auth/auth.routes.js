const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { checkLimit } = require('../../middlewares/dbRateLimiter');

router.post('/check-mobile', checkLimit('otp'), authController.checkMobile);
router.post('/register', authController.register);
router.post('/login', checkLimit('login'), authController.login);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.get('/sid', authMiddleware, authController.getSID);
router.put('/profile', authMiddleware, authController.updateProfile);

router.post('/family', authMiddleware, authController.addFamily);
router.get('/family', authMiddleware, authController.getFamily);

router.get('/referrer/:code', authController.getReferrer);

module.exports = router;
