const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin, comparePin } = require('../../utils/hash');
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');

const register = async (req, res) => {
    try {
        let { mobile, country_code = '+91', name, pin } = req.body;

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

        // Create user and initial wallets Transactionally
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    mobile,
                    country_code,
                    name,
                    pin_hash,
                    cid,
                    role: 'USER_178',
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
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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

const getMe = async (req, res) => {
    const user = {
        id: req.user.id,
        name: req.user.name,
        mobile: req.user.mobile,
        cid: req.user.cid,
        role: req.user.role,
        status: req.user.status,
        country_code: req.user.country_code
    };
    return successResponse(res, 200, 'User details retrieved successfully', { user });
};

module.exports = {
    register,
    login,
    logout,
    getMe
};
