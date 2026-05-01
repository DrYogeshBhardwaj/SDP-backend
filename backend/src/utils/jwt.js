const jwt = require('jsonwebtoken');

const generateToken = (payload, isPaid = false) => {
    const secret = process.env.JWT_SECRET || "SINAANK_BACKUP_SECRET_DO_NOT_USE_IN_PROD";
    const expiry = isPaid ? '365d' : '7d';
    console.log('[JWT_GEN] Using Secret:', secret === process.env.JWT_SECRET ? 'FROM_ENV' : 'FALLBACK');
    return jwt.sign(payload, secret, { expiresIn: expiry });
};

const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || "SINAANK_BACKUP_SECRET_DO_NOT_USE_IN_PROD";
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken
};
