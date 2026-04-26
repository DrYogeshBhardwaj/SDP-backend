const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const { activateJoiningInternal } = require('./seeder.service');

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

        // Allow BASIC or BUSINESS to become SEEDER (Partner)
        if (user.role !== 'BASIC' && user.role !== 'BUSINESS') {
            return errorResponse(res, 403, 'Account not eligible for partner activation');
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

        return successResponse(res, 200, 'Partner status activated successfully', {
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

        const referrals = await prisma.referral.findMany({
            where: { referrerId: userId, status: 'ACTIVE' },
            include: {
                referredUser: {
                    select: { name: true, mobile: true, role: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const level1 = referrals.filter(r => r.level === 1);
        const level2 = referrals.filter(r => r.level === 2);
        const level3 = referrals.filter(r => r.level === 3);

        // Calculate Points: BASIC=1, BUSINESS/SEEDER/ADMIN=4
        let totalPoints = 0;
        referrals.forEach(r => {
            const role = r.referredUser.role;
            totalPoints += (role === 'BUSINESS' || role === 'SEEDER') ? 4 : 1;
        });

        // Earned calculation from BonusLedger for accuracy
        const bonuses = await prisma.bonusLedger.aggregate({
            where: { userId, status: 'COMPLETED' },
            _sum: { amount: true }
        });

        return successResponse(res, 200, 'Network Tree fetched', {
            stats: { 
                level1Count: level1.length, 
                level2Count: level2.length, 
                level3Count: level3.length,
                totalPoints,
                totalEarned: bonuses._sum.amount || 0
            },
            level1: level1.map(ref => ref.referredUser),
            level2: level2.map(ref => ref.referredUser),
            level3: level3.map(ref => ref.referredUser)
        });
    } catch (e) {
        return errorResponse(res, 500, 'Failed to fetch network tree', e);
    }
};


const activateJoining = async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan, name, pincode, city, state, country, upiId, profileImageBase64, age_group } = req.body;

        if (!plan || (plan !== 'basic' && plan !== 'business')) {
            return errorResponse(res, 400, 'Invalid plan selected');
        }

        // Before calling internal activation, optionally update user profile if extra data was provided (Admin Manual)
        if (name || pincode || city || state || country || upiId || profileImageBase64 || age_group) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    name,
                    pincode,
                    city,
                    state,
                    country,
                    upi_id: upiId,
                    profile_photo: profileImageBase64,
                    age_group
                }
            });
        }

        const result = await activateJoiningInternal(userId, plan);

        return successResponse(res, 200, 'Account activated successfully', result);
    } catch (e) {
        console.error("Activation failed:", e);
        return errorResponse(res, 500, 'Activation failed', e.message);
    }
};

const awardBonus = async (tx, referrerId, sourceUserId, amount, type, level) => {
    // 1. Create/Update Referral entry
    await tx.referral.upsert({
        where: { referredUserId_level: { referredUserId: sourceUserId, level: level } },
        update: { referralStatus: 'ACTIVE', referrerId: referrerId },
        create: { referrerId: referrerId, referredUserId: sourceUserId, level: level, referralStatus: 'ACTIVE' }
    });

    // 2. Transaction history (Derived Wallet Balance)
    await tx.transaction.create({
        data: {
            userId: referrerId,
            type: 'BONUS',
            amount: amount,
            credit: amount,
            description: `Level ${level} Bonus from Join (${type})`,
            txStatus: 'COMPLETED'
        }
    });

    // 4. Bonus Ledger for tracking
    await tx.bonusLedger.create({
        data: {
            userId: referrerId,
            amount,
            type,
            sourceUserId,
            incomeStatus: 'PAID'
        }
    });
};

module.exports = {
    activateSeeder,
    getNetworkTree,
    activateJoining
};
