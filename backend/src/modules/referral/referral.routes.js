const express = require('express');
const router = express.Router();
const referralController = require('./referral.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.get('/team', authMiddleware, referralController.getDirectTeam);
router.get('/network', authMiddleware, referralController.getNetworkData);

module.exports = router;
