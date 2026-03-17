const express = require('express');
const router = express.Router();
const minutesController = require('./minutes.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.post('/start-session', authMiddleware, minutesController.startSession);
router.get('/balance', authMiddleware, minutesController.getBalance);
router.get('/history', authMiddleware, minutesController.getHistory);

module.exports = router;
