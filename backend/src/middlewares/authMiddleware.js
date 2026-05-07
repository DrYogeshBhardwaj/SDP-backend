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

    req.user = decoded; // { userId, sid }
    
    // 2. Validate Session ID in DB
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { activeSessionId: true }
    });

    if (!user || user.activeSessionId !== decoded.sid) {
        return errorResponse(res, 401, 'Session Expired: Logged in on another device');
    }

    next();
};

module.exports = { authMiddleware };
