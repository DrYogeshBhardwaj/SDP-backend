const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.get('/me', (req, res) => res.send("OK"));

module.exports = router;
