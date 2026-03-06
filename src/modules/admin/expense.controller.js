const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const createExpense = async (req, res) => {
    try {
        const { category, amount, description, date } = req.body;
        const adminId = req.user.id; // From auth middleware

        if (!category || amount === undefined || !description || !date) {
            return errorResponse(res, 400, 'Missing required fields: category, amount, description, date');
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            return errorResponse(res, 400, 'Invalid amount');
        }

        const expenseDate = new Date(date);

        // Strictly Append-only creation
        const expense = await prisma.systemExpense.create({
            data: {
                adminId,
                category,
                amount: parsedAmount,
                description,
                date: expenseDate
            }
        });

        return successResponse(res, 201, 'System expense recorded successfully', { expense });

    } catch (error) {
        console.error("Create Expense Error:", error);
        return errorResponse(res, 500, 'Failed to create expense', error.message);
    }
};

const getExpenses = async (req, res) => {
    try {
        const expenses = await prisma.systemExpense.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                admin: { select: { name: true, mobile: true } }
            }
        });

        // The net profit should be calculated dynamically
        // Calculate total expenses dynamically here to return with the list
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        return successResponse(res, 200, 'Expenses retrieved successfully', {
            totalExpenses,
            expenses
        });

    } catch (error) {
        console.error("Get Expenses Error:", error);
        return errorResponse(res, 500, 'Failed to retrieve expenses', error.message);
    }
};

module.exports = {
    createExpense,
    getExpenses
};
