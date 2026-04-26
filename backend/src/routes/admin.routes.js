const express = require('express');
const router = express.Router();
const adminController = require('../modules/admin/admin.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const staffMiddleware = require('../middlewares/staff.middleware');

// Public Master Verification (Password Only)
router.post('/verify-master', adminController.verifyMasterPass);
router.post('/verify-mfa', adminController.verifyAdminMFA);


// Protect all routes
router.use(authMiddleware);

// -- STAFF ROUTES (Admin + Cashier) --
router.get('/payouts', staffMiddleware, adminController.getPayouts);
router.put('/payout/:id', staffMiddleware, adminController.processPayout);
router.get('/pending-balances', staffMiddleware, adminController.getPendingBalances);
router.get('/stats', staffMiddleware, adminController.getStats);


// -- MASTER ADMIN ONLY ROUTES --
router.use(adminMiddleware);

router.get('/users', adminController.getAllUsers);
router.get('/network-tree', adminController.getNetworkTree);
router.get('/cash-logs', adminController.getCashLogs);
router.post('/sweep-payouts', adminController.sweepToPayouts);
router.get('/queries', adminController.getQueries);
router.put('/query/:id', adminController.updateQuery);
router.put('/user/:id', adminController.updateUser);
router.get('/config', adminController.getSystemConfig);
router.post('/update-config', adminController.updateSystemConfig);
router.post('/manual-payout', adminController.createManualPayout);
router.get('/security-logs', adminController.getSecurityLogs);


module.exports = router;

