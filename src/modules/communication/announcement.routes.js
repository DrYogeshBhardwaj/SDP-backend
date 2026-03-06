const express = require('express');
const router = express.Router();
const { getAnnouncements } = require('./announcement.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware);

// Visible to SEEDER and ADMIN
router.get('/', getAnnouncements);

module.exports = router;
