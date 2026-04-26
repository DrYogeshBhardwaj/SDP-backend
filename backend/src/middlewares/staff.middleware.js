const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { errorResponse } = require('../utils/response');

/**
 * Staff Middleware: Allows ADMIN and CASHIER roles.
 * Used for payout processing and basic management.
 */
const staffMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return errorResponse(res, 401, 'Unauthorized');
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) return errorResponse(res, 403, 'User not found');

        // Allow if user is ADMIN or CASHIER
        if (user.role === 'ADMIN' || user.role === 'CASHIER') {
            req.staffUser = user;
            return next();
        }

        return errorResponse(res, 403, 'Permission Denied: Staff access required');
    } catch (err) {
        return errorResponse(res, 500, 'Authorization Error');
    }
};

module.exports = staffMiddleware;
