const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const ALLOWED_DURATIONS = [2, 5, 10];

const startSession = async (req, res) => {
    try {
        const { duration } = req.body;
        const userId = req.user.id;

        if (!duration || !ALLOWED_DURATIONS.includes(duration)) {
            return errorResponse(res, 400, 'Invalid duration. Allowed values: 2, 5, 10');
        }

        let remainingMinutes = 0;

        await prisma.$transaction(async (tx) => {
            // 1. Fetch current balance
            const wallet = await tx.walletMinute.findUnique({
                where: { userId }
            });

            if (!wallet || wallet.balance < duration) {
                throw new Error('Insufficient minutes balance');
            }

            // 2. Deduct full duration immediately
            const updatedWallet = await tx.walletMinute.update({
                where: { userId },
                data: {
                    balance: {
                        decrement: duration
                    }
                }
            });

            remainingMinutes = updatedWallet.balance;

            // 3. Create transaction log
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'MINUTE_DEDUCT',
                    amount: duration,
                    description: `Started a ${duration} minute session`,
                    status: 'COMPLETED'
                }
            });
        });

        return successResponse(res, 200, 'Session started successfully', {
            deducted: duration,
            remaining_minutes: remainingMinutes
        });

    } catch (error) {
        if (error.message === 'Insufficient minutes balance') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, 'Failed to start session', error);
    }
};

const getBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch the current balance
        const wallet = await prisma.walletMinute.findUnique({
            where: { userId }
        });

        // Fetch total historically deducted minutes using aggregate
        const aggregateDeductions = await prisma.transaction.aggregate({
            where: {
                userId,
                type: 'MINUTE_DEDUCT',
                status: 'COMPLETED'
            },
            _sum: {
                amount: true
            }
        });

        const currentBalance = wallet ? wallet.balance : 0;
        const usedMinutes = aggregateDeductions._sum.amount || 0;
        const totalMinutes = currentBalance + usedMinutes; // Since used minutes are fully deducted and never refunded

        return successResponse(res, 200, 'Balance fetched successfully', {
            total_minutes: totalMinutes,
            used_minutes: usedMinutes,
            remaining_minutes: currentBalance
        });

    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch balance', error);
    }
};

module.exports = {
    startSession,
    getBalance
};
