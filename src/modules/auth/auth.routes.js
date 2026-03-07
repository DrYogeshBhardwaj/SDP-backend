const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');

router.post('/check-mobile', authController.checkMobile);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/referrer/:code', authController.getReferrer);

module.exports = router;
