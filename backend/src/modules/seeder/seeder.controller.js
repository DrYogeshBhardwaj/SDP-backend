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

        const { upiId, profileImageBase64, pincode, city, country } = req.body;

        const referralCode = await generateReferralCode();

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: 'SEEDER',
                referral_code: referralCode,
                upi_id: upiId || undefined,
                profile_photo: profileImageBase64 || undefined,
                pincode: pincode || undefined,
                city: city || undefined,
                country: country || 'India'
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

const getNetworkTree = async (req, res) => {
    try {
        const userId = req.user.id;

        const level1 = await prisma.referral.findMany({
            where: { referrerId: userId, level: 1, status: 'ACTIVE' },
            include: {
                referredUser: {
                    select: { name: true, mobile: true, role: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const level2 = await prisma.referral.findMany({
            where: { referrerId: userId, level: 2, status: 'ACTIVE' },
            include: {
                referredUser: {
                    select: { name: true, mobile: true, role: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalEarnedDirect = level1.length * 220;
        const totalEarnedIndirect = level2.length * 150;
        const totalEarned = totalEarnedDirect + totalEarnedIndirect;

        return successResponse(res, 200, 'Network Tree fetched', {
            stats: { level1Count: level1.length, level2Count: level2.length, totalEarned, totalEarnedDirect, totalEarnedIndirect },
            level1: level1.map(ref => ref.referredUser),
            level2: level2.map(ref => ref.referredUser)
        });
    } catch (e) {
        return errorResponse(res, 500, 'Failed to fetch network tree', e);
    }
};

module.exports = {
    activateSeeder,
    getNetworkTree
};
