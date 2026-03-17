const express = require('express');
const router = express.Router();
const {
    checkMobile,
    register,
    login,
    logout,
    getMe,
    updateProfile,
    addFamily,
    getFamily,
    getReferrer
} = require('./auth.controller');

// Debugging undefined exports (will log in Railway)
console.log("Auth Controller Exports:", { checkMobile, register, login, logout, getMe, updateProfile, addFamily, getFamily, getReferrer });

router.post('/check-mobile', checkMobile);
router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);

router.post('/family', authMiddleware, addFamily);
router.get('/family', authMiddleware, getFamily);

router.get('/referrer/:code', getReferrer);

module.exports = router;
