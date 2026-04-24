const express = require('express');
const router = express.Router();
const seederController = require('./seeder.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { activationLimiter } = require('../../middlewares/rateLimiter');

router.post('/activate', authMiddleware, seederController.activateSeeder);
router.post('/activate-joining', authMiddleware, activationLimiter, seederController.activateJoining);
router.get('/network-tree', authMiddleware, seederController.getNetworkTree);

module.exports = router;
