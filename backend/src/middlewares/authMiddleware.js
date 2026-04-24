const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 401, 'Unauthorized');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return errorResponse(res, 401, 'Invalid Session');
    }

    req.user = decoded; // { userId }
    next();
};

module.exports = { authMiddleware };
