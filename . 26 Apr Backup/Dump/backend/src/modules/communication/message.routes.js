const express = require('express');
const router = express.Router();
const { sendMessage, getThread, getInbox, resolveThread } = require('./message.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Protect all routes with JWT
router.use(authMiddleware);

// Send Message (User -> Admin AI / Admin -> User)
router.post('/send', sendMessage);

// Get Statistics/Inbox Overview (Admin only)
router.get('/inbox', getInbox);

// Get User's own support thread (Non-admin)
router.get('/thread', getThread);

// Get specific user thread (Admin only)
router.get('/thread/:userId', getThread);

// Resolve support thread (Admin only)
router.post('/resolve-thread/:userId', resolveThread);

module.exports = router;

