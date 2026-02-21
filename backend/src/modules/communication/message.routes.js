const express = require('express');
const router = express.Router();
const { sendMessage, getThread, markAsRead } = require('./message.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

// Protect all routes with JWT
router.use(authMiddleware);

// Create Message (Append-only)
router.post('/', sendMessage);

// Get paginated thread with a specific user
router.get('/:userId', getThread);

// Mark specific message as read
router.put('/:id/read', markAsRead);

module.exports = router;
