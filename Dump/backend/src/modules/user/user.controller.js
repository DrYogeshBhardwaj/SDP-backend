const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * Update User UPI ID
 * POST /api/user/update-upi
 */
const updateUpi = async (req, res) => {
    try {
        const userId = req.user.userId; // From authMiddleware
        const { upiId } = req.body;

        if (!upiId) {
            return errorResponse(res, 400, 'UPI ID is required');
        }

        // Basic UPI format validation: name@bank
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiId)) {
            return errorResponse(res, 400, 'Invalid UPI format. Expected: name@bank');
        }

        // SECURITY CHECK (V1): Max 5 users per UPI ID
        const upiUsageCount = await prisma.user.count({
            where: { upi_id: upiId }
        });

        if (upiUsageCount >= 5) {
            return errorResponse(res, 400, 'This UPI ID is already linked to the maximum number of accounts (5). Please use a different UPI ID.');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { upi_id: upiId }
        });

        return successResponse(res, 200, 'UPI ID updated successfully', {
            upi_id: user.upi_id
        });
    } catch (error) {
        console.error('Update UPI Error:', error);
        return errorResponse(res, 500, 'Failed to update UPI ID');
    }
};

module.exports = {
    updateUpi
};
