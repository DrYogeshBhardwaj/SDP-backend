const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * V1 Auth Controller (Clean Slate)
 */
const login = async (req, res) => {
    try {
        const { mobile } = req.body;
        const user = await prisma.user.findUnique({ where: { mobile } });
        
        if (!user) return errorResponse(res, 404, 'User not found');
        
        const token = generateToken({ userId: user.id });
        return successResponse(res, 200, 'Login Success', { token, user: { id: user.id, mobile: user.mobile } });
    } catch (err) {
        return errorResponse(res, 500, 'Login failed');
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
             where: { id: userId },
             include: { 
                 wallets: true,
                 transactions: {
                     where: { category: { not: 'REGISTRATION_FEE' } },
                     include: { 
                         fromUser: { 
                             select: { mobile: true, name: true } 
                         } 
                     },
                     orderBy: { createdAt: 'desc' },
                     take: 50
                 }
             }
        });
        if (!user) return errorResponse(res, 404, 'User no longer exists');

        const cashBalance = user.wallets.find(w => w.type === 'CASH')?.balance || 0;

        // MLM Stats
        const directs = await prisma.user.findMany({
            where: { sponsorId: userId },
            select: { id: true }
        });
        const directCount = directs.length;
        const directIds = directs.map(d => d.id);
        
        const teamCount = await prisma.user.count({
            where: { sponsorId: { in: directIds } }
        });

        return successResponse(res, 200, 'Profile Data', {
            id: user.id,
            mobile: user.mobile,
            name: user.name,
            photo: user.photo,
            minutesBalance: user.minutesBalance,
            cashBalance: cashBalance,
            directCount,
            teamCount,
            transactions: user.transactions,
            dailyMinutesUsed: user.dailyMinutesUsed,
            referralCode: user.referralCode,
            upiId: user.upiId,
            goalType: user.goalType,
            goalPlanets: user.goalPlanets,
            goalLockUntil: user.goalLockUntil
        });
    } catch (err) {
        console.error('[PROFILE_FETCH_ERR_FULL]', {
            message: err.message,
            stack: err.stack,
            userId: req.user?.userId
        });
        return errorResponse(res, 500, `Profile fetch failed: ${err.message}`);
    }
};

const powerRegister = async (req, res) => {
    try {
        const { mobile, sponsorCode } = req.body;
        const { registerUser } = require('./registration.service');
        
        const user = await registerUser({ mobile, sponsorCode });
        const token = generateToken({ userId: user.id });
        
        return successResponse(res, 201, 'Power Registration Success', { 
            token, 
            user: { id: user.id, mobile: user.mobile } 
        });
    } catch (err) {
        if (err.message === 'ALREADY_EXISTS') return errorResponse(res, 400, 'Already registered');
        console.error('[V1_POWER_REG_ERROR]', err);
        return errorResponse(res, 500, 'Power Registration failed');
    }
};

module.exports = { login, getMe, powerRegister };
