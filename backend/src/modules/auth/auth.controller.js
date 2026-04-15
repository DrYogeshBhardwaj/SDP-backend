const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin, comparePin } = require('../../utils/hash');
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');
const { checkAndAwardMilestones } = require('../referral/milestone.service');
const sidService = require('../user/sid.service');
const { recordFailure, resetFailures } = require('../../middlewares/dbRateLimiter');

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

const checkMobile = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid mobile number' });
        }

        const user = await prisma.user.findUnique({ where: { mobile } });
        return res.json({ success: true, exists: !!user, role: user ? user.role : null });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Initial check failed' });
    }
};

const { registerUser } = require('./registration.service');

const register = async (req, res) => {
    try {
        // Register user
        let { mobile, name, pin, sponsor, orderId, plan_type, amount } = req.body;
        
        if (!orderId) {
            return errorResponse(res, 400, 'Order ID is required for registration');
        }

        const user = await registerUser({
            mobile,
            name,
            pin,
            plan_type: plan_type || 'BASIC',
            amount: amount || 779,
            sponsor: sponsor || '',
            orderId
        });

        // Generate Session Token
        const token = generateToken({
            userId: user.id,
            role: user.role,
            cid: user.cid
        });

        // Set Cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return successResponse(res, 201, 'Registration successful', {
            token,
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                cid: user.cid,
                role: user.role,
                plan_type: user.plan_type
            }
        });

    } catch (error) {
        if (error.message === 'USER_ALREADY_EXISTS') {
            return errorResponse(res, 400, 'Mobile number is already registered');
        }
        console.error("REGISTER API CRASH:", error);
        return errorResponse(res, 500, error.message || 'Registration failed');
    }
};

const login = async (req, res) => {
    try {
        let { mobile, pin } = req.body;

        mobile = String(mobile);
        pin = String(pin);

        if (!mobile || !pin) {
            return errorResponse(res, 400, 'Mobile and PIN are required');
        }

        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        // We do not reveal if the mobile exists
        if (!user) {
            return errorResponse(res, 401, 'Invalid credentials');
        }

        const isMatch = await comparePin(pin, user.pin_hash);

        if (!isMatch) {
            await recordFailure(req, 'login');
            return errorResponse(res, 401, 'Invalid credentials');
        }

        // Login Success - Reset Failures
        await resetFailures(req, 'login');

        if (user.status === 'BLOCKED') {
            return errorResponse(res, 403, 'Account is blocked');
        }

        // Generate SID if missing (Legacy User Fallback)
        if (user.sid_color1 === null) {
            await sidService.generateUniqueSID(user.id);
        }

        // Generate JWT
        const token = generateToken({
            userId: user.id,
            role: user.role,
            cid: user.cid
        });

        // Store in HttpOnly cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: true, // Required for SameSite=None
            sameSite: 'none', // Required for cross-domain cookies
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return successResponse(res, 200, 'Login successful', {
            token, // Returning token for localStorage
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                cid: user.cid,
                role: user.role,
                kit_activated: user.kit_activated,
                plan_type: user.plan_type
            }


        });

    } catch (error) {
        console.error("LOGIN API CRASH:", error);
        return res.status(500).json({ success: false, message: 'Login failed', error: error.message || error.toString() });
    }
};

const logout = async (req, res) => {
    res.clearCookie('jwt');
    return successResponse(res, 200, 'Logged out successfully');
};

const addFamily = async (req, res) => {
    try {
        const { mobile, pin } = req.body;
        const ownerId = req.user.id;

        if (req.user.role !== 'USER_580' && req.user.role !== 'SEEDER') {
            return errorResponse(res, 403, 'Only Family plan or Seeder users can add family members');
        }

        if (!mobile || !pin || mobile.length !== 10 || pin.length !== 4) {
            return errorResponse(res, 400, 'Invalid mobile or PIN format');
        }

        if (mobile === req.user.mobile) {
            return errorResponse(res, 400, 'Cannot add your own number as family member');
        }

        // Enforce Limits
        const maxMembers = 3;
        const currentMembers = await prisma.user.count({ where: { familyOwnerId: ownerId } });

        if (currentMembers >= maxMembers) {
            return errorResponse(res, 400, `You have reached your limit of ${maxMembers} family members.`);
        }

        const existingUser = await prisma.user.findUnique({ where: { mobile } });
        if (existingUser) {
            return errorResponse(res, 400, 'Mobile number is already registered');
        }

        const { hashPin } = require('../../utils/hash');
        const pin_hash = await hashPin(pin);
        const cid = `CID_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    mobile,
                    name: "Family Member",
                    pin_hash,
                    cid,
                    role: 'USER_178',
                    familyOwnerId: ownerId
                }
            });

            await tx.walletMinute.create({
                data: { userId: newUser.id, balance: 3650 }
            });

            await tx.walletCash.create({
                data: { userId: newUser.id, balance: 0.0 }
            });
        });

        return successResponse(res, 201, 'Family member added successfully');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to add family member', error);
    }
};

const getFamily = async (req, res) => {
    try {
        const members = await prisma.user.findMany({
            where: { familyOwnerId: req.user.id },
            select: { id: true, mobile: true, createdAt: true, name: true }
        });
        return successResponse(res, 200, 'Family members retrieved', { members });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to retrieve family members', error);
    }
};

const getMe = async (req, res) => {
    try {
        const walletMinute = await prisma.walletMinute.findUnique({
            where: { userId: req.user.id }
        });
        const walletCash = await prisma.walletCash.findUnique({
            where: { userId: req.user.id }
        });

        const user = await prisma.user.findUnique({
             where: { id: req.user.id }
        });

        // Calculate total bonus dynamically or default to 0
        const bonusAggregate = await prisma.bonusLedger.aggregate({
            where: { userId: req.user.id },
            _sum: { amount: true }
        });
        const totalBonus = bonusAggregate._sum.amount || 0;

        const userData = {
            id: user.id,
            name: user.name,
            mobile: user.mobile,
            cid: user.cid,
            role: user.role,
            referral_code: user.referral_code,
            status: user.status,
            country_code: user.country_code,
            upi_id: user.upi_id,
            profile_photo: user.profile_photo,
            sid: {
                color1: user.sid_color1,
                color2: user.sid_color2,
                leftHz: user.sid_left_hz,
                rightHz: user.sid_right_hz,
                sinaankId: user.referral_code
            },
            minutesBalance: walletMinute ? walletMinute.balance : 0,
            walletBalance: walletCash ? walletCash.balance : 0,
            totalBonus: totalBonus
        };
        return successResponse(res, 200, 'User details retrieved successfully', { user: userData });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch user details', error);
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, profile_photo } = req.body;

        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (profile_photo !== undefined) dataToUpdate.profile_photo = profile_photo;

        if (Object.keys(dataToUpdate).length === 0) {
            return errorResponse(res, 400, 'No data to update');
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: dataToUpdate
        });

        return successResponse(res, 200, 'Profile updated successfully', {
            name: updatedUser.name,
            profile_photo: updatedUser.profile_photo
        });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to update profile', error);
    }
};

const getReferrer = async (req, res) => {
    try {
        const { code } = req.params;
        const referrer = await prisma.user.findFirst({
            where: {
                OR: [
                    { referral_code: code },
                    { mobile: code }
                ]
            },
            select: { name: true, mobile: true }
        });

        if (!referrer) {
            return errorResponse(res, 404, 'Referrer not found');
        }

        return successResponse(res, 200, 'Referrer fetched successfully', {
            name: referrer.name || 'SDP Partner',
            mobile: referrer.mobile
        });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch referrer', error);
    }
};

const getSID = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        
        if (!user) return errorResponse(res, 404, 'User not found');
        
        // Generate on the fly if still missing
        if (user.sid_color1 === null) {
            const updated = await sidService.generateUniqueSID(user.id);
            return successResponse(res, 200, 'SID generated and retrieved', {
                sinaankId: updated.referral_code,
                color1: updated.sid_color1,
                color2: updated.sid_color2,
                leftHz: updated.sid_left_hz,
                rightHz: updated.sid_right_hz
            });
        }

        return successResponse(res, 200, 'SID retrieved', {
            sinaankId: user.referral_code,
            color1: user.sid_color1,
            color2: user.sid_color2,
            leftHz: user.sid_left_hz,
            rightHz: user.sid_right_hz
        });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch SID', error);
    }
};

module.exports = {
    checkMobile,
    register,
    login,
    logout,
    addFamily,
    getFamily,
    getMe,
    getSID,
    getReferrer,
    updateProfile,
    generateReferralCode
};
