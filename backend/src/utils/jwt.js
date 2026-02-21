const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sdp_super_secret_key_123';
const JWT_EXPIRES_IN = '7d';

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken
};
