const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const saveUpiId = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { upiId } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.upiId) {
            return errorResponse(res, 400, 'UPI ID is locked. Contact Admin for changes.');
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { upiId }
        });

        return successResponse(res, 200, 'UPI ID saved and locked.', updated);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to save UPI ID');
    }
};

const requestPayout = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.upiId) {
            return errorResponse(res, 400, 'Please save your UPI ID first');
        }

        if (!amount || amount < 500) {
            return errorResponse(res, 400, 'Minimum payout amount is ₹500');
        }
        
        const wallet = await prisma.wallet.findFirst({
            where: { userId, type: 'CASH' }
        });

        if (!wallet || wallet.balance < amount) {
            return errorResponse(res, 400, 'Insufficient balance');
        }

        await prisma.$transaction([
            prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } }
            }),
            prisma.payout.create({
                data: {
                    userId,
                    amount,
                    status: 'PENDING'
                }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    amount,
                    type: 'DEBIT',
                    category: 'PAYOUT_REQUEST',
                    description: `Payout request for ₹${amount}`
                }
            })
        ]);

        return successResponse(res, 201, 'Payout requested successfully');
    } catch (err) {
        return errorResponse(res, 500, 'Failed to request payout');
    }
};

const submitQuery = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { subject, message } = req.body;

        const query = await prisma.supportQuery.create({
            data: {
                userId,
                subject,
                message,
                status: 'PENDING'
            }
        });

        const { getAIResponse } = require('../../utils/ai');
        
        // Process AI Response in background
        setTimeout(async () => {
             try {
                 const aiReply = await getAIResponse(message);
                 await prisma.supportQuery.update({
                     where: { id: query.id },
                     data: { 
                         response: aiReply,
                         status: 'RESOLVED' 
                     }
                 });
             } catch(e) { console.error('Gemini API Fail:', e); }
        }, 1000); // 1 second delay for realism

        return successResponse(res, 201, 'Query submitted. AI Response pending...', query);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to submit query');
    }
};

const getMyQueries = async (req, res) => {
    try {
        const userId = req.user.userId;
        const queries = await prisma.supportQuery.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
        return successResponse(res, 200, 'My Queries', queries);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch queries');
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;
        
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { name }
        });
        
        return successResponse(res, 200, 'Profile updated', updated);
    } catch (err) {
        return errorResponse(res, 500, 'Update failed');
    }
};

module.exports = { requestPayout, submitQuery, getMyQueries, saveUpiId, updateProfile };
