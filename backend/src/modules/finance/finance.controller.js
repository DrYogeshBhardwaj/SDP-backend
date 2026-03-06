const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const requestPayout = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = req.user;

        // Condition 1: User role must be SEEDER
        if (user.role !== 'SEEDER') {
            return errorResponse(res, 403, 'Only SEEDER accounts can request payouts');
        }

        // Execute as a SERIALIZABLE transaction to lock the balance and ensure sequential processing
        const result = await prisma.$transaction(async (tx) => {
            // Fetch wallet cash balance
            const walletCash = await tx.walletCash.findUnique({
                where: { userId }
            });

            // Condition 2: Wallet balance must be > 0
            if (!walletCash || walletCash.balance <= 0) {
                throw new Error('Insufficient balance to request payout');
            }

            // Note: Application-level check (for cleaner error message if not strictly concurrent)
            const existingPending = await tx.payout.findFirst({
                where: { userId, status: 'PENDING' }
            });

            if (existingPending) {
                throw new Error('You already have a pending payout request');
            }

            const payoutAmount = walletCash.balance;

            // Process: Create payout entry
            const payout = await tx.payout.create({
                data: {
                    userId,
                    amount: payoutAmount,
                    status: 'PENDING'
                }
            });

            // Immediate Wallet Deduction + DB Lock via activePayoutId
            await tx.walletCash.update({
                where: { userId },
                data: {
                    balance: { decrement: payoutAmount },
                    activePayoutId: payout.id
                }
            });

            return {
                payout_id: payout.id,
                requested_amount: payout.amount,
                status: payout.status
            };
        }, {
            isolationLevel: 'Serializable'
        });

        return successResponse(res, 201, 'Payout requested successfully', result);

    } catch (error) {
        // Handle database-level UNIQUE constraint violation (Race Condition intercepted)
        if (error.code === 'P2002') {
            return successResponse(res, 200, 'Payout already processing', { note: 'Idempotent success' });
        }
        console.error('Payout Request Error:', error);
        return errorResponse(res, 400, error.message || 'Failed to request payout');
    }
};

module.exports = {
    requestPayout
};
