const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const validateDateRange = (start, end) => {
    if (!start || !end) {
        throw new Error("startDate and endDate query parameters are required");
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format provided");
    }

    if (startDate > endDate) {
        throw new Error("startDate cannot be after endDate");
    }

    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
        throw new Error("Date range cannot exceed 365 days");
    }

    return { startDate, endDate };
};

const sendCsvStream = async (res, filename, getHeaders, fetchDataChunk) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    try {
        const headers = getHeaders();
        res.write(headers.join(',') + '\n');

        let skip = 0;
        const limit = 500;
        let hasMore = true;

        while (hasMore) {
            const dataChunk = await fetchDataChunk(skip, limit);

            if (dataChunk.length === 0) {
                hasMore = false;
                break;
            }

            dataChunk.forEach(row => {
                // Escape commas and quotes
                const csvRow = row.map(cell => {
                    const str = String(cell !== null && cell !== undefined ? cell : '');
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                });
                res.write(csvRow.join(',') + '\n');
            });

            skip += limit;

            // Allow garbage collection and event loop tick
            await new Promise(resolve => setImmediate(resolve));
        }

        res.end();
    } catch (error) {
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Internal server error during export' });
        }
        res.end();
    }
};

const exportTransactions = async (req, res) => {
    try {
        const { startDate, endDate } = validateDateRange(req.query.startDate, req.query.endDate);

        const filename = `export-transactions-${new Date().toISOString().split('T')[0]}.csv`;

        await sendCsvStream(res, filename,
            () => ['ID', 'User ID', 'User Name', 'Mobile', 'CID', 'Type', 'Amount', 'Description', 'Status', 'Date'],
            async (skip, take) => {
                const txs = await prisma.transaction.findMany({
                    where: {
                        transactionDate: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    skip,
                    take,
                    orderBy: { transactionDate: 'asc' },
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        description: true,
                        status: true,
                        transactionDate: true,
                        user: {
                            select: { id: true, name: true, mobile: true, cid: true }
                        }
                    }
                });

                return txs.map(tx => [
                    tx.id,
                    tx.user.id,
                    tx.user.name,
                    tx.user.mobile,
                    tx.user.cid,
                    tx.type,
                    tx.amount,
                    tx.description,
                    tx.status,
                    tx.transactionDate.toISOString()
                ]);
            }
        );
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Validation failed' });
    }
};

const exportPayouts = async (req, res) => {
    try {
        const { startDate, endDate } = validateDateRange(req.query.startDate, req.query.endDate);

        const filename = `export-payouts-${new Date().toISOString().split('T')[0]}.csv`;

        await sendCsvStream(res, filename,
            () => ['ID', 'User ID', 'User Name', 'Mobile', 'CID', 'Amount', 'Status', 'Requested At', 'Processed At', 'Remarks'],
            async (skip, take) => {
                const payouts = await prisma.payout.findMany({
                    where: {
                        requested_at: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    skip,
                    take,
                    orderBy: { requested_at: 'asc' },
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        requested_at: true,
                        processed_at: true,
                        remarks: true,
                        user: {
                            select: { id: true, name: true, mobile: true, cid: true }
                        }
                    }
                });

                return payouts.map(p => [
                    p.id,
                    p.user.id,
                    p.user.name,
                    p.user.mobile,
                    p.user.cid,
                    p.amount,
                    p.status,
                    p.requested_at.toISOString(),
                    p.processed_at ? p.processed_at.toISOString() : '',
                    p.remarks
                ]);
            }
        );
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Validation failed' });
    }
};

const exportBonusLedger = async (req, res) => {
    try {
        const { startDate, endDate } = validateDateRange(req.query.startDate, req.query.endDate);

        const filename = `export-bonus-ledger-${new Date().toISOString().split('T')[0]}.csv`;

        await sendCsvStream(res, filename,
            () => ['ID', 'User ID', 'User Name', 'Mobile', 'Amount', 'Type', 'Source User ID', 'Source Name', 'Date'],
            async (skip, take) => {
                const blocks = await prisma.bonusLedger.findMany({
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    skip,
                    take,
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        amount: true,
                        type: true,
                        createdAt: true,
                        user: {
                            select: { id: true, name: true, mobile: true }
                        },
                        sourceUser: {
                            select: { id: true, name: true }
                        }
                    }
                });

                return blocks.map(b => [
                    b.id,
                    b.user.id,
                    b.user.name,
                    b.user.mobile,
                    b.amount,
                    b.type,
                    b.sourceUser ? b.sourceUser.id : '',
                    b.sourceUser ? b.sourceUser.name : '',
                    b.createdAt.toISOString()
                ]);
            }
        );
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Validation failed' });
    }
};


const exportExpenses = async (req, res) => {
    try {
        const { startDate, endDate } = validateDateRange(req.query.startDate, req.query.endDate);

        const filename = `export-expenses-${new Date().toISOString().split('T')[0]}.csv`;

        await sendCsvStream(res, filename,
            () => ['ID', 'Admin ID', 'Admin Name', 'Category', 'Amount', 'Description', 'Expense Date', 'Logged At'],
            async (skip, take) => {
                const expenses = await prisma.systemExpense.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    skip,
                    take,
                    orderBy: { date: 'asc' },
                    select: {
                        id: true,
                        category: true,
                        amount: true,
                        description: true,
                        date: true,
                        createdAt: true,
                        admin: {
                            select: { id: true, name: true }
                        }
                    }
                });

                return expenses.map(e => [
                    e.id,
                    e.admin.id,
                    e.admin.name,
                    e.category,
                    e.amount,
                    e.description,
                    e.date.toISOString(),
                    e.createdAt.toISOString()
                ]);
            }
        );
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Validation failed' });
    }
};

module.exports = {
    exportTransactions,
    exportPayouts,
    exportBonusLedger,
    exportExpenses
};
