const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * Therapy Controller (V1 Clean Slate)
 * Handles session starts, ends, and minute tracking for Sinaank V1.
 */

const startSession = async (req, res) => {
    try {
        const { goalType, planets } = req.body;
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return errorResponse(res, 404, 'User not found');

        // Check limits
        if (user.v1_minutes_balance <= 0) return errorResponse(res, 400, 'Zero balance');
        if (user.v1_daily_minutes_used >= 15) return errorResponse(res, 400, 'Daily limit reached');

        // Atomic session update
        const session = await prisma.therapySession.create({
            data: {
                userId,
                module: 'V1-THERAPY',
                status: 'ACTIVE',
                startedAt: new Date()
            }
        });

        // Update user's current goal if changed
        await prisma.user.update({
            where: { id: userId },
            data: {
                v1_goal_type: goalType,
                v1_goal_planets: planets,
                v1_last_session_at: new Date()
            }
        });

        return successResponse(res, 200, 'Session Started', { sessionId: session.id });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to start session');
    }
};

const endSession = async (req, res) => {
    try {
        const { sessionId, minutesUsed } = req.body;
        const userId = req.user.userId;

        const session = await prisma.therapySession.findUnique({ where: { id: sessionId } });
        if (!session || session.status !== 'ACTIVE') return errorResponse(res, 404, 'Active session not found');

        const actualMinutes = Math.min(minutesUsed || 1, 15);

        // Atomic Transaction: Close Session and Deduct Minutes
        await prisma.$transaction([
            prisma.therapySession.update({
                where: { id: sessionId },
                data: {
                    status: 'COMPLETED',
                    endedAt: new Date(),
                    minutesUsed: actualMinutes
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    v1_minutes_balance: { decrement: actualMinutes },
                    v1_daily_minutes_used: { increment: actualMinutes },
                    v1_total_minutes_consumed: { increment: actualMinutes }
                }
            })
        ]);

        return successResponse(res, 200, 'Session Completed', { minutesDeducted: actualMinutes });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to end session');
    }
};

module.exports = {
    startSession,
    endSession
};
