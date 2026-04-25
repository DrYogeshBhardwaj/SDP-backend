const express = require('express');
const router = express.Router();
const adminController = require('../modules/admin/admin.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Public Master Verification (Password Only)
router.post('/verify-master', adminController.verifyMasterPass);

// Protect all routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.get('/network-tree', adminController.getNetworkTree);
router.get('/cash-logs', adminController.getCashLogs);
router.get('/payouts', adminController.getPayouts);
router.get('/pending-balances', adminController.getPendingBalances);
router.post('/sweep-payouts', adminController.sweepToPayouts);
router.put('/payout/:id', adminController.processPayout);
router.get('/queries', adminController.getQueries);
router.put('/query/:id', adminController.updateQuery);
router.put('/user/:id', adminController.updateUser);
router.get('/config', adminController.getSystemConfig);
router.post('/update-config', adminController.updateSystemConfig);


module.exports = router;
