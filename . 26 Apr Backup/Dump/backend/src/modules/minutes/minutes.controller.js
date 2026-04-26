const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * 1. Start Therapy Session
 * RULE 1: STRICT BALANCE BLOCK - Block if balance < 2.
 * RULE 2: GLOBAL ONE ACTIVE SESSION - Search any active session.
 * RULE 3: MODULE SWITCH - If module changes, update to "MULTI". Resume instead of start.
 */
const startTherapySession = async (req, res) => {
    try {
        const { module } = req.body;
        const userId = req.user.id;

        if (!module) return errorResponse(res, 400, 'Module is required');

        // 1. GLOBAL SEARCH for existing ACTIVE session
        const activeSession = await prisma.therapySession.findFirst({
            where: { userId, status: 'ACTIVE' },
            orderBy: { startedAt: 'desc' }
        });

        if (activeSession) {
            // MODULE SWITCH LOGIC: If user starts a different module, update to "MULTI"
            if (activeSession.module !== module && activeSession.module !== 'MULTI') {
                await prisma.therapySession.update({
                    where: { id: activeSession.id },
                    data: { module: 'MULTI' }
                });
            }

            return successResponse(res, 200, 'Session resumed', { 
                sessionId: activeSession.id,
                resumed: true,
                currentModule: activeSession.module !== module ? 'MULTI' : activeSession.module
            });
        }

        // 2. STRICT BALANCE GUARD (Only for new sessions)
        const wallet = await prisma.walletMinute.findUnique({ where: { userId } });
        if (!wallet || wallet.balance < 2) {
            return errorResponse(res, 403, 'Minimum 2 minutes required to start therapy. Please Top-up.');
        }

        // 3. START NEW SESSION with 2-minute Reservation
        const session = await prisma.$transaction(async (tx) => {
            const s = await tx.therapySession.create({
                data: { userId, module, status: 'ACTIVE' }
            });

            // Deduct 2 minutes reserve
            await tx.walletMinute.update({
                where: { userId },
                data: { balance: { decrement: 2 } }
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'MINUTE_DEDUCT',
                    amount: 2,
                    description: `Therapy Start: ${module} (2 mins reserved)`,
                    txStatus: 'COMPLETED'
                }
            });

            return s;
        });

        return successResponse(res, 201, 'Session started', { 
            sessionId: session.id,
            resumed: false
        });

    } catch (error) {
        console.error('Start Therapy Error:', error);
        return errorResponse(res, 500, 'Failed to start session');
    }
};

/**
 * 2. Ping Therapy Session
 * RULE: MAX 60 MIN CAP - Auto close if duration >= 60 mins.
 */
const pingTherapySession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return errorResponse(res, 400, 'Session ID required');

        const session = await prisma.therapySession.findUnique({ where: { id: sessionId } });
        if (!session || session.status !== 'ACTIVE') return errorResponse(res, 404, 'Active session not found');

        // Check for 60 Minute Limit
        const elapsedMinutes = (Date.now() - session.startedAt) / (1000 * 60);
        if (elapsedMinutes >= 60) {
            const result = await finalizeSession(session.id, 'TIMEOUT');
            return successResponse(res, 200, 'Session completed (60 min limit reached)', { 
                timeout: true, 
                totalUsed: result.totalUsed 
            });
        }

        // Normal Ping
        await prisma.therapySession.update({
            where: { id: sessionId },
            data: { lastPingAt: new Date() }
        });

        return successResponse(res, 200, 'Ping successful');
    } catch (error) {
        return errorResponse(res, 500, 'Ping failed');
    }
};

/**
 * 3. End Therapy Session (Manual)
 * Updates status to "ENDED"
 */
const endTherapySession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return errorResponse(res, 400, 'Session ID required');

        const result = await finalizeSession(sessionId, 'ENDED');
        if (!result.success) return errorResponse(res, 400, result.message || 'End failed');

        return successResponse(res, 200, 'Session ended successfully', result);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to end session');
    }
};

/**
 * Helper: Finalize Session (Billing Logic)
 * Shared between ENDED, ABANDONED, and TIMEOUT
 * RULE: reserve = 2, actual = floor(mins), final = max(2, actual), adjust = final - 2
 */
async function finalizeSession(sessionId, finalStatus) {
    return await prisma.$transaction(async (tx) => {
        const session = await tx.therapySession.findUnique({ where: { id: sessionId } });
        if (!session || session.status !== 'ACTIVE') return { success: false, message: 'Session not active' };

        const durationSec = Math.floor((new Date() - session.startedAt) / 1000);
        const actualMinutes = Math.floor(durationSec / 60);
        
        // Final math: max(2, floor(seconds/60))
        let finalUsed = Math.max(2, actualMinutes);
        
        // Apply 60 min hard cap if it's a timeout or just safety
        if (finalUsed > 60) finalUsed = 60;
        
        const adjustment = finalUsed - 2; // Difference from the initial 2-min reserve

        if (adjustment > 0) {
            const wallet = await tx.walletMinute.findUnique({ where: { userId: session.userId } });
            // Deduct what is possible, don't go negative if we can help it, 
            // though the business rule says "adjust wallet".
            await tx.walletMinute.update({
                where: { userId: session.userId },
                data: { balance: { decrement: adjustment } }
            });

            await tx.transaction.create({
                data: {
                    userId: session.userId,
                    type: 'MINUTE_DEDUCT',
                    amount: adjustment,
                    description: `Therapy Final Adjust: ${session.module} (+${adjustment} min)`,
                    txStatus: 'COMPLETED'
                }
            });
        }

        const updated = await tx.therapySession.update({
            where: { id: sessionId },
            data: {
                status: finalStatus,
                endedAt: new Date(),
                minutesUsed: finalUsed
            }
        });

        return { success: true, totalUsed: finalUsed, session: updated };
    });
}

/**
 * 4. Background Task: Auto Abandon & Auto Timeout
 */
const autoAbandonSessions = async () => {
    try {
        const activeSessions = await prisma.therapySession.findMany({
            where: { status: 'ACTIVE' }
        });

        const now = Date.now();
        for (const session of activeSessions) {
            const elapsedMins = (now - session.startedAt) / (1000 * 60);
            const pingMins = (now - session.lastPingAt) / (1000 * 60);

            // 1. HARD TIMEOUT (60 mins)
            if (elapsedMins >= 60) {
                await finalizeSession(session.id, 'TIMEOUT');
                console.log(`[Therapy] Session ${session.id} force-timed out (60 min).`);
                continue;
            }

            // 2. ABANDONED (No heartbeat for 2 mins)
            if (pingMins > 2) {
                await finalizeSession(session.id, 'ABANDONED');
                console.log(`[Therapy] Session ${session.id} abandoned (no heartbeat).`);
            }
        }
    } catch (err) {
        console.error('[Therapy] Task runner failed:', err);
    }
};

const getActiveSession = async (req, res) => {
    try {
        const session = await prisma.therapySession.findFirst({
            where: { userId: req.user.id, status: 'ACTIVE' },
            orderBy: { startedAt: 'desc' }
        });
        return successResponse(res, 200, 'Checked active session', { session });
    } catch (e) {
        return errorResponse(res, 500, 'Fetch failed');
    }
};

const getBalance = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { minutes: true }
        });
        return successResponse(res, 200, 'Fetched balance', {
            minutes_balance: user.minutes ? user.minutes.balance : 0,
            plan_type: user.plan_type
        });
    } catch (e) {
        return errorResponse(res, 500, 'Fetch failed');
    }
};

const getHistory = async (req, res) => {
    try {
        const sessions = await prisma.therapySession.findMany({
            where: { userId: req.user.id },
            orderBy: { startedAt: 'desc' },
            take: 20
        });
        return successResponse(res, 200, 'Fetched history', { sessions });
    } catch (e) {
        return errorResponse(res, 500, 'Fetch failed');
    }
};

module.exports = {
    startTherapySession,
    pingTherapySession,
    endTherapySession,
    getActiveSession,
    getBalance,
    getHistory,
    autoAbandonSessions
};
