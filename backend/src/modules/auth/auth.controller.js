const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin, comparePin } = require('../../utils/hash');
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');
const { checkAndAwardMilestones } = require('../referral/milestone.service');

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

const register = async (req, res) => {
    try {
        let { mobile, country_code = '+91', name, pin, amount } = req.body;

        // Validation
        if (!mobile || !pin) {
            return errorResponse(res, 400, 'Mobile and PIN are required');
        }
        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            return errorResponse(res, 400, 'Mobile must be a 10-digit number');
        }
        if (pin.length !== 4 || !/^\d+$/.test(pin)) {
            return errorResponse(res, 400, 'PIN must be exactly 4 digits');
        }

        // Auto-capitalize name if provided
        if (name && typeof name === 'string') {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { mobile }
        });

        if (existingUser) {
            // Do not reveal if mobile exists for security, just send a generic success 
            // or error message. The requirement specifically asked: "Do not reveal if mobile exists".
            // Let's pretend it worked or return a vague error. For registration flow, returning success might confuse them, 
            // but returning "Account creation completed or already exists" is safest.
            return successResponse(res, 201, 'Registration processed successfully');
        }

        // Hash PIN
        const pin_hash = await hashPin(pin);

        // Generate a unique CID (simplified logic, usually needs uniqueness check)
        const cid = `CID_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Role Assignment based on purchase intent
        let assignedRole = 'USER_178';
        if (amount === 580 || amount === '580') {
            assignedRole = 'USER_580';
        }

        // Create user and initial wallets Transactionally
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    mobile,
                    country_code,
                    name,
                    pin_hash,
                    cid,
                    role: assignedRole,
                    status: 'ACTIVE'
                }
            });

            await tx.walletMinute.create({
                data: {
                    userId: user.id,
                    balance: 3650
                }
            });

            await tx.walletCash.create({
                data: {
                    userId: user.id,
                    balance: 0.0
                }
            });

            // Handle Referral Logic if a referral code was provided
            if (req.body.referral_code) {
                const referrer = await tx.user.findUnique({
                    where: { referral_code: req.body.referral_code },
                    include: { referredBy: true }
                });

                if (referrer && referrer.role === 'SEEDER' && referrer.status === 'ACTIVE') {
                    // Level 1 Commission
                    const level1Amount = 220;
                    await tx.walletCash.update({
                        where: { userId: referrer.id },
                        data: { balance: { increment: level1Amount } }
                    });
                    await tx.transaction.create({
                        data: {
                            userId: referrer.id,
                            type: 'BONUS',
                            amount: level1Amount,
                            description: `Level 1 Referral Bonus from ${name || 'User'}`,
                            status: 'COMPLETED'
                        }
                    });
                    await tx.bonusLedger.create({
                        data: { userId: referrer.id, amount: level1Amount, type: 'DIRECT', sourceUserId: user.id }
                    });
                    await tx.referral.create({
                        data: { referrerId: referrer.id, referredUserId: user.id, level: 1 }
                    });
                    await checkAndAwardMilestones(referrer.id, tx);

                    // Level 2 Commission
                    const level1Referral = referrer.referredBy.find(r => r.level === 1);
                    if (level1Referral) {
                        const level2Referrer = await tx.user.findUnique({ where: { id: level1Referral.referrerId } });
                        if (level2Referrer && level2Referrer.role === 'SEEDER' && level2Referrer.status === 'ACTIVE') {
                            const level2Amount = 150;
                            await tx.walletCash.update({
                                where: { userId: level2Referrer.id },
                                data: { balance: { increment: level2Amount } }
                            });
                            await tx.transaction.create({
                                data: { userId: level2Referrer.id, type: 'BONUS', amount: level2Amount, description: `Level 2 Referral Bonus from ${name || 'User'}`, status: 'COMPLETED' }
                            });
                            await tx.bonusLedger.create({
                                data: { userId: level2Referrer.id, amount: level2Amount, type: 'LEVEL2', sourceUserId: user.id }
                            });
                            await tx.referral.create({
                                data: { referrerId: level2Referrer.id, referredUserId: user.id, level: 2 }
                            });
                            await checkAndAwardMilestones(level2Referrer.id, tx);
                        }
                    }
                }
            }
        });

        return successResponse(res, 201, 'Registration processed successfully');
    } catch (error) {
        return errorResponse(res, 500, 'Registration failed', error);
    }
};

const login = async (req, res) => {
    try {
        const { mobile, pin } = req.body;

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
            return errorResponse(res, 401, 'Invalid credentials');
        }

        if (user.status === 'BLOCKED') {
            return errorResponse(res, 403, 'Account is blocked');
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
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                cid: user.cid,
                role: user.role
            }
        });

    } catch (error) {
        return errorResponse(res, 500, 'Login failed', error);
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

        // Calculate total bonus dynamically or default to 0
        const bonusAggregate = await prisma.bonusLedger.aggregate({
            where: { userId: req.user.id },
            _sum: { amount: true }
        });
        const totalBonus = bonusAggregate._sum.amount || 0;

        const user = {
            id: req.user.id,
            name: req.user.name,
            mobile: req.user.mobile,
            cid: req.user.cid,
            role: req.user.role,
            referral_code: req.user.referral_code,
            status: req.user.status,
            country_code: req.user.country_code,
            upi_id: req.user.upi_id,
            profile_photo: req.user.profile_photo,
            minutesBalance: walletMinute ? walletMinute.balance : 0,
            walletBalance: walletCash ? walletCash.balance : 0,
            totalBonus: totalBonus
        };
        return successResponse(res, 200, 'User details retrieved successfully', { user });
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

module.exports = {
    checkMobile,
    register,
    login,
    logout,
    addFamily,
    getFamily,
    getMe,
    getReferrer,
    updateProfile
};
