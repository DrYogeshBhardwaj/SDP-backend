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

        // Fetch wallet cash balance
        const walletCash = await prisma.walletCash.findUnique({
            where: { userId }
        });

        // Condition 2: Wallet balance must be > 0
        if (!walletCash || walletCash.balance <= 0) {
            return errorResponse(res, 400, 'Insufficient balance to request payout');
        }

        // Condition 3: No existing PENDING payouts
        const existingPending = await prisma.payout.findFirst({
            where: {
                userId,
                status: 'PENDING'
            }
        });

        if (existingPending) {
            return errorResponse(res, 400, 'You already have a pending payout request');
        }

        // Process: Create payout entry (snapshotting exact wallet amount at request time)
        // Note: Wallet balance is NOT reduced here, only at approval.
        const payoutAmount = walletCash.balance;

        const payout = await prisma.payout.create({
            data: {
                userId,
                amount: payoutAmount,
                status: 'PENDING'
            }
        });

        return successResponse(res, 201, 'Payout requested successfully', {
            payout_id: payout.id,
            requested_amount: payout.amount,
            status: payout.status
        });

    } catch (error) {
        console.error('Payout Request Error:', error);
        return errorResponse(res, 500, 'Failed to request payout', { message: error.message });
    }
};

module.exports = {
    requestPayout
};
