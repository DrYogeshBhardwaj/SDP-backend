const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');
const { registerUser } = require('./registration.service');

/**
 * Auth Controller (V1 Clean Slate)
 * Handles registration, login, and profile fetching.
 */

const register = async (req, res) => {
    try {
        const { mobile, sponsorCode } = req.body;
        if (!mobile || mobile.length !== 10) return errorResponse(res, 400, 'Invalid Mobile');

        const user = await registerUser({ mobile, sponsorCode });
        
        const token = generateToken({ userId: user.id });
        return successResponse(res, 201, 'Registration Success', { token, user: { id: user.id, mobile: user.mobile } });
    } catch (err) {
        if (err.message === 'ALREADY_EXISTS') return errorResponse(res, 400, 'User already exists');
        return errorResponse(res, 500, 'Registration failed');
    }
};

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
        const user = await prisma.user.findUnique({
             where: { id: req.user.userId }
        });
        if (!user) return errorResponse(res, 404, 'Not found');

        return successResponse(res, 200, 'Profile', {
            user: {
                id: user.id,
                mobile: user.mobile,
                v1_minutes_balance: user.v1_minutes_balance,
                v1_daily_minutes_used: user.v1_daily_minutes_used,
                v1_goal_type: user.v1_goal_type,
                v1_goal_planets: user.v1_goal_planets,
                v1_goal_lock_until: user.v1_goal_lock_until,
                referral_code: user.referral_code
            }
        });
    } catch (err) {
        return errorResponse(res, 500, 'Profile fetch failed');
    }
};

module.exports = {
    register,
    login,
    getMe
};
