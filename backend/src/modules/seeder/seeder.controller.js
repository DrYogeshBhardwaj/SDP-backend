const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

// Generate unique referral code (e.g., SDP-XXXXXX)
const generateReferralCode = async () => {
    let isUnique = false;
    let code = '';
    while (!isUnique) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `SDP-${randomStr}`;
        const existing = await prisma.user.findUnique({
            where: { referral_code: code }
        });
        if (!existing) {
            isUnique = true;
        }
    }
    return code;
};

const activateSeeder = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch latest user state
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        if (user.role === 'SEEDER') {
            return errorResponse(res, 400, 'User is already a SEEDER');
        }

        if (user.role !== 'USER_580') {
            return errorResponse(res, 403, 'Only FAMILY (USER_580) accounts can become a SEEDER');
        }

        const referralCode = await generateReferralCode();

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: 'SEEDER',
                referral_code: referralCode
            }
        });

        return successResponse(res, 200, 'Seeder activated successfully', {
            referral_code: updatedUser.referral_code,
            role: updatedUser.role
        });
    } catch (error) {
        return errorResponse(res, 500, 'Seeder activation failed', error);
    }
};

module.exports = {
    activateSeeder
};
