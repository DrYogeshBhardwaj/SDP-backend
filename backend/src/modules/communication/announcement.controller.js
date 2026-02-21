const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const createAnnouncement = async (req, res) => {
    try {
        const { title, message } = req.body;
        const created_by = req.user.id;

        if (!title || !message) {
            return errorResponse(res, 400, 'Title and message are required');
        }

        // Basic sanitization (No raw HTML allowed)
        const sanitizedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const sanitizedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const announcement = await prisma.announcement.create({
            data: {
                title: sanitizedTitle,
                message: sanitizedMessage,
                created_by
            }
        });

        return successResponse(res, 201, 'Announcement created successfully', { announcement });
    } catch (error) {
        console.error("Create Announcement Error:", error);
        return errorResponse(res, 500, 'Failed to create announcement', error.message);
    }
};

const getAnnouncements = async (req, res) => {
    try {
        const role = req.user.role;

        // Allowed roles: SEEDER, ADMIN
        if (role !== 'ADMIN' && role !== 'SEEDER') {
            return errorResponse(res, 403, 'Unauthorized to view announcements');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                creator: { select: { id: true, name: true, role: true } }
            }
        });

        return successResponse(res, 200, 'Announcements retrieved', {
            page,
            limit,
            count: announcements.length,
            announcements
        });
    } catch (error) {
        console.error("Get Announcements Error:", error);
        return errorResponse(res, 500, 'Failed to fetch announcements', error.message);
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements
};
