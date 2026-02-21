const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const purchaseProduct = async (req, res) => {
    try {
        const { product_id } = req.body;
        const userId = req.user.id;

        if (!product_id) {
            return errorResponse(res, 400, 'Product ID is required');
        }

        const product = await prisma.product.findUnique({
            where: { id: product_id }
        });

        if (!product || !product.isActive) {
            return errorResponse(res, 404, 'Product not found or inactive');
        }

        // Role mapping based on product type
        const newRole = product.type === 'FAMILY' ? 'USER_580' : 'USER_178';

        await prisma.$transaction(async (tx) => {
            // 1. Update user role
            await tx.user.update({
                where: { id: userId },
                data: { role: newRole }
            });

            // 2. Reset wallet minutes strictly to product allocated amount
            await tx.walletMinute.upsert({
                where: { userId },
                update: { balance: product.minutes_allocated },
                create: {
                    userId,
                    balance: product.minutes_allocated
                }
            });

            // 3. Create transaction log (Append only)
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'PURCHASE',
                    amount: product.price,
                    description: `Purchased ${product.name} plan`,
                    status: 'COMPLETED'
                }
            });
        });

        return successResponse(res, 200, 'Purchase successful', {
            product: product.name,
            minutes_allocated: product.minutes_allocated,
            new_role: newRole
        });

    } catch (error) {
        return errorResponse(res, 500, 'Purchase failed', error);
    }
};

module.exports = {
    purchaseProduct
};
