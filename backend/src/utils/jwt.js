const jwt = require('jsonwebtoken');

const generateToken = (payload, isPaid = false) => {
    const expiry = isPaid ? '365d' : '7d';
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiry });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken
};
