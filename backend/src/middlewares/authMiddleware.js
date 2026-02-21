const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return errorResponse(res, 401, 'Unauthorized - No token provided');
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return errorResponse(res, 401, 'Unauthorized - Invalid token');
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return errorResponse(res, 401, 'Unauthorized - User not found');
        }

        if (user.status === 'BLOCKED') {
            return errorResponse(res, 403, 'Forbidden - Account is blocked');
        }

        req.user = user;
        next();
    } catch (error) {
        return errorResponse(res, 401, 'Unauthorized - Token verification failed', error);
    }
};

module.exports = authMiddleware;
