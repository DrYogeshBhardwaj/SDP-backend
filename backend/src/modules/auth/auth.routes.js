const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.post('/check-mobile', authController.checkMobile);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

router.post('/family', authMiddleware, authController.addFamily);
router.get('/family', authMiddleware, authController.getFamily);

router.get('/referrer/:code', authController.getReferrer);

module.exports = router;
