const express = require('express');
const router = express.Router();
const minutesController = require('./minutes.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.post('/start', authMiddleware, minutesController.startTherapySession);
router.post('/ping', authMiddleware, minutesController.pingTherapySession);
router.post('/end', authMiddleware, minutesController.endTherapySession);
router.get('/active', authMiddleware, minutesController.getActiveSession);
router.get('/balance', authMiddleware, minutesController.getBalance);
router.get('/history', authMiddleware, minutesController.getHistory);

module.exports = router;
