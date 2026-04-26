const express = require('express');
const router = express.Router();
const therapyController = require('../modules/therapy/therapy.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/start', authMiddleware, therapyController.startSession);
router.post('/end', authMiddleware, therapyController.endSession);

module.exports = router;
