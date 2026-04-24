const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { errorResponse } = require('../utils/response');

const MASTER_ADMINS = ['9211755211', '7777777777']; // Hardcoded for full security proof

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return errorResponse(res, 401, 'Unauthorized');
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user || user.role !== 'ADMIN') {
            return errorResponse(res, 403, 'Permission Denied: Admin access required');
        }

        // Extra layer: Only hardcoded master numbers can access critical admin APIs
        if (!MASTER_ADMINS.includes(user.mobile.trim())) {
             console.warn(`[SECURITY_ALERT] Non-master admin ${user.mobile} tried to access Admin API`);
             return errorResponse(res, 403, 'Permission Denied: Master Admin access required');
        }

        req.adminUser = user; // Optionally pass full user to next
        next();
    } catch (err) {
        return errorResponse(res, 500, 'Authorization Error');
    }
};

module.exports = adminMiddleware;
