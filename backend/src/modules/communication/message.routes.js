const express = require('express');
const router = express.Router();
const { sendMessage, getThread, markAsRead, getInbox } = require('./message.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Protect all routes with JWT
router.use(authMiddleware);

// Create Message (Append-only)
router.post('/', sendMessage);

// Get All Conversations (Inbox)
router.get('/admin/inbox', getInbox);

// Get current user thread with Admin
router.get('/thread', getThread);

// Get paginated thread with a specific user (Admin only or explicitly targets Admin UUID)
router.get('/:userId', getThread);

// Mark specific message as read
router.put('/:id/read', markAsRead);

module.exports = router;
