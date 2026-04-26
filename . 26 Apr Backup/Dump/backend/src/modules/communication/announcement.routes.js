const express = require('express');
const router = express.Router();
const { 
    getAnnouncements, 
    getLatestAnnouncement, 
    markAnnouncementSeen 
} = require('./announcement.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Publicly available (for authenticated users)
router.use(authMiddleware);

router.get('/', getAnnouncements);
router.get('/latest', getLatestAnnouncement);
router.post('/seen/:id', markAnnouncementSeen);

module.exports = router;
