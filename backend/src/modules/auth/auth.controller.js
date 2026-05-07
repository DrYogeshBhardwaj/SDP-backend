const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * V1 Auth Controller (Clean Slate)
 */
const login = async (req, res) => {
    try {
        const { mobile, force } = req.body;
        const user = await prisma.user.findUnique({ where: { mobile } });
        
        if (!user) return errorResponse(res, 404, 'User not found');
        
        // 1. Check for active session
        if (user.activeSessionId && !force) {
            return successResponse(res, 200, 'ALREADY_LOGGED_IN', { 
                needsConfirmation: true,
                message: 'You are already logged in on another device. Do you want to logout from there and continue?'
            });
        }

        // 2. Generate Session ID
        const crypto = require('crypto');
        const sid = crypto.randomUUID();

        // 3. Update User with new Session ID
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sid }
        });

        const token = generateToken({ userId: user.id, sid }, user.isBusinessUnlocked);
        return successResponse(res, 200, 'Login Success', { token, user: { id: user.id, mobile: user.mobile } });
    } catch (err) {
        console.error('[LOGIN_ERROR]', err);
        return errorResponse(res, 500, `Login failed: ${err.message}`);
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma.user.update({
            where: { id: userId },
            data: { activeSessionId: null }
        });
        return successResponse(res, 200, 'Logout Success');
    } catch (err) {
        return errorResponse(res, 500, 'Logout failed');
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Fetch user basic data first
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallets: true }
        });

        if (!user) return errorResponse(res, 404, 'User no longer exists');

        // Self-healing: If unlocked but no referral code, generate one
        if (user.isBusinessUnlocked && !user.referralCode) {
            const { generateReferralCode } = require('../../utils/referral');
            const newCode = generateReferralCode();
            await prisma.user.update({
                where: { id: userId },
                data: { referralCode: newCode }
            });
            user.referralCode = newCode; // Update local object for response
        }

        let transactions = [];
        try {
            // Try fetching with fromUser details
            const txData = await prisma.transaction.findMany({
                where: { userId, category: { not: 'REGISTRATION_FEE' } },
                include: { fromUser: { select: { mobile: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            transactions = txData;
        } catch (e) {
            console.error('Prisma Include Fail, using simple tx fetch:', e.message);
            transactions = await prisma.transaction.findMany({
                where: { userId, category: { not: 'REGISTRATION_FEE' } },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
        }

        const cashBalance = user.wallets.find(w => w.type === 'CASH')?.balance || 0;

        // MLM Stats
        const directs = await prisma.user.findMany({
            where: { sponsorId: userId },
            select: { id: true, name: true, mobile: true, createdAt: true }
        });
        const directCount = directs.length;
        const directIds = directs.map(d => d.id);
        
        const team = await prisma.user.findMany({
            where: { sponsorId: { in: directIds } },
            select: { name: true, mobile: true, sponsor: { select: { name: true } }, createdAt: true }
        });
        const teamCount = team.length;

        return successResponse(res, 200, 'Profile Data', {
            id: user.id,
            mobile: user.mobile,
            name: user.name,
            avatar: user.avatar,
            minutesBalance: user.minutesBalance,
            cashBalance: cashBalance,
            directCount,
            teamCount,
            directs,
            team,
            transactions: transactions,
            dailyMinutesUsed: user.dailyMinutesUsed,
            referralCode: user.referralCode,
            upiId: user.upiId,
            isBusinessUnlocked: user.isBusinessUnlocked,
            plan: user.plan,
            therapySound: user.therapySound,
            therapyImage: user.therapyImage,
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
        
        // Session tracking
        const crypto = require('crypto');
        const sid = crypto.randomUUID();
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sid }
        });

        const token = generateToken({ userId: user.id, sid });
        
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

module.exports = { login, getMe, powerRegister, logout };
