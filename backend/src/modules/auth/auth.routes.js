console.log("🔥 AUTH ROUTES LOADED - NEW FILE");
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { loginLimiter } = require('../../middlewares/rateLimiter');

console.log("authMiddleware:", typeof authMiddleware);
console.log("getMe:", typeof authController.getMe);

router.post('/check-mobile', authController.checkMobile);
router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);

router.get('/me', 
    (req,res,next)=>{ next(); },
    (req,res)=>{ res.send("OK"); }
);

router.put('/profile', authMiddleware, authController.updateProfile);

router.post('/family', authMiddleware, authController.addFamily);
router.get('/family', authMiddleware, authController.getFamily);

router.get('/referrer/:code', authController.getReferrer);

module.exports = router;
