const express = require('express');
const router = express.Router();
const userController = require('../modules/user/user.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/payout-request', userController.requestPayout);
router.post('/query', userController.submitQuery);
router.get('/queries', userController.getMyQueries);
router.post('/upi', userController.saveUpiId);
router.put('/update-profile', userController.updateProfile);

module.exports = router;
