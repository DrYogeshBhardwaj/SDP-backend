const express = require('express');
const router = express.Router();
const { createAnnouncement } = require('./announcement.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

router.use(authMiddleware, requireAdmin);

// Create Announcement (Append-only)
router.post('/', createAnnouncement);

module.exports = router;
