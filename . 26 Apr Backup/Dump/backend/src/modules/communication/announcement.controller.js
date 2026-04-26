const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const createAnnouncement = async (req, res) => {
    try {
        const { title, message, priority } = req.body;
        const created_by = req.user.id;

        if (!title || !message) {
            return errorResponse(res, 400, 'Title and message are required');
        }

        const sanitizedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const sanitizedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const announcement = await prisma.announcement.create({
            data: { title: sanitizedTitle, message: sanitizedMessage, created_by, priority: priority || 'NORMAL' }
        });

        return successResponse(res, 201, 'Announcement created successfully', { announcement });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to create announcement');
    }
};

const getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return successResponse(res, 200, 'Announcements retrieved', announcements);
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch announcements');
    }
};

/**
 * Get Latest Unseen/Critical Announcement for current user
 */
const getLatestAnnouncement = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { seen_announcement_id: true }
        });

        const latest = await prisma.announcement.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!latest) return successResponse(res, 200, 'No announcements', null);

        // Logic based on Priority:
        // NORMAL -> Never pop up
        // IMPORTANT -> Pop up if not seen
        // CRITICAL -> Always pop up (force until dismissed)
        
        let shouldPopup = false;
        if (latest.priority === 'CRITICAL') {
            shouldPopup = true;
        } else if (latest.priority === 'IMPORTANT') {
            shouldPopup = user.seen_announcement_id !== latest.id;
        }

        return successResponse(res, 200, 'Latest announcement status', {
            announcement: latest,
            shouldPopup,
            isSeen: user.seen_announcement_id === latest.id
        });
    } catch (error) {
        return errorResponse(res, 500, 'Failed to fetch latest announcement');
    }
};

/**
 * Mark announcement as seen to prevent recurrent popups
 */
const markAnnouncementSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.update({
            where: { id: req.user.id },
            data: { seen_announcement_id: id }
        });
        return successResponse(res, 200, 'Announcement marked as seen');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to mark announcement as seen');
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements,
    getLatestAnnouncement,
    markAnnouncementSeen
};
