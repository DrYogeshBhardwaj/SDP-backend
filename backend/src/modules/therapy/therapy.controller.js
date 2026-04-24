const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * V1 Therapy Controller (Clean Slate)
 */
const startSession = async (req, res) => {
    try {
        const { goalType, planets } = req.body;
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return errorResponse(res, 404, 'User not found');
        if (user.minutesBalance <= 0) return errorResponse(res, 400, 'Insufficient balance');
        if (user.dailyMinutesUsed >= 15) return errorResponse(res, 400, 'Daily limit reached');

        const session = await prisma.therapySession.create({
            data: {
                userId,
                duration: 15, // Max daily allow
                status: 'ACTIVE'
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                goalType,
                goalPlanets: planets,
                lastSessionAt: new Date()
            }
        });

        return successResponse(res, 200, 'Session started', { sessionId: session.id });
    } catch (err) {
        return errorResponse(res, 500, 'Start failed');
    }
};

const endSession = async (req, res) => {
    try {
        const { sessionId, minutesUsed } = req.body;
        const userId = req.user.userId;

        const actualMin = Math.min(minutesUsed || 1, 15);

        await prisma.$transaction([
            prisma.therapySession.update({
                where: { id: sessionId },
                data: { status: 'COMPLETED', endedAt: new Date(), minutesUsed: actualMin }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    minutesBalance: { decrement: actualMin },
                    dailyMinutesUsed: { increment: actualMin },
                    totalMinutesConsumed: { increment: actualMin }
                }
            })
        ]);

        return successResponse(res, 200, 'Session completed', { minUsed: actualMin });
    } catch (err) {
        return errorResponse(res, 500, 'End failed');
    }
};

module.exports = { startSession, endSession };
