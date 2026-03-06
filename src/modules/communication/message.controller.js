const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        let actualReceiverId = receiverId;
        if (!actualReceiverId) {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
            if (!admin) return errorResponse(res, 500, 'No administrator found in the system');
            actualReceiverId = admin.id;
        }

        // Validate receiver
        const receiver = await prisma.user.findUnique({
            where: { id: actualReceiverId }
        });

        if (!receiver) {
            return errorResponse(res, 404, 'Receiver not found');
        }

        // Logic Rule: Normal users can only message ADMIN.
        // Admins can message anyone.
        if (senderRole !== 'ADMIN' && receiver.role !== 'ADMIN') {
            return errorResponse(res, 403, 'Users can only message Administrators');
        }

        // Strictly Append-only creation (no editing/deleting endpoints provided)
        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId: actualReceiverId,
                content,
                status: 'UNREAD'
            }
        });

        return successResponse(res, 201, 'Message sent successfully', { message });

    } catch (error) {
        console.error("Send Message Error:", error);
        return errorResponse(res, 500, 'Failed to send message', error.message);
    }
};

const getThread = async (req, res) => {
    try {
        let targetUserId = req.params.userId;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Magic route mapping for non-admins to fetch their thread with the first available Admin
        if (!targetUserId || targetUserId === 'thread') {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
            if (!admin) return errorResponse(res, 500, 'Administration account not found');
            targetUserId = admin.id;
        }

        // Pagination logic explicitly required
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Authorization Rule: Non-admins can only fetch threads with admins
        if (currentUserRole !== 'ADMIN') {
            const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser || targetUser.role !== 'ADMIN') {
                return errorResponse(res, 403, 'Users can only view threads with Administrators');
            }
        }

        const activeUserId = currentUserId;

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: activeUserId, receiverId: targetUserId },
                    { senderId: targetUserId, receiverId: activeUserId }
                ]
            },
            orderBy: { createdAt: 'desc' }, // Latest first
            skip,
            take: limit,
            include: {
                sender: { select: { id: true, name: true, role: true } },
                receiver: { select: { id: true, name: true, role: true } }
            }
        });

        return successResponse(res, 200, 'Thread retrieved successfully', {
            page,
            limit,
            count: messages.length,
            messages
        });

    } catch (error) {
        console.error("Get Thread Error:", error);
        return errorResponse(res, 500, 'Failed to retrieve thread', error.message);
    }
};

const markAsRead = async (req, res) => {
    try {
        const messageId = req.params.id;
        const currentUserId = req.user.id;

        const message = await prisma.message.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            return errorResponse(res, 404, 'Message not found');
        }

        // Only the receiver can mark it as read
        if (message.receiverId !== currentUserId) {
            return errorResponse(res, 403, 'Unauthorized to alter this message state');
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: { status: 'READ' }
        });

        return successResponse(res, 200, 'Message marked as READ', { message: updatedMessage });

    } catch (error) {
        console.error("Mark Read Error:", error);
        return errorResponse(res, 500, 'Failed to map message read', error.message);
    }
};

const getInbox = async (req, res) => {
    try {
        const adminId = req.user.id;
        if (req.user.role !== 'ADMIN') return errorResponse(res, 403, 'Unauthorized');

        // Note: SQLite/Postgres compatibility. Get unique users where active messaging occurred.
        const conversationsRaw = await prisma.$queryRaw`
            SELECT 
                u.id as "userId",
                u.name,
                u.mobile,
                (SELECT status FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastStatus",
                (SELECT content FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastMessage",
                (SELECT "createdAt" FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastActivity",
                (SELECT COUNT(*) FROM "Message" m WHERE m."senderId" = u.id AND m."receiverId" = ${adminId} AND m."status" = 'UNREAD') as "unreadCount"
            FROM "User" u
            WHERE EXISTS (
                SELECT 1 FROM "Message" m 
                WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) 
                   OR (m."receiverId" = u.id AND m."senderId" = ${adminId})
            )
            ORDER BY "lastActivity" DESC
        `;

        // Normalize BigInts from Raw Queries if any (Prisma returns BigInt for COUNT)
        const normalize = (val) => typeof val === 'bigint' ? Number(val) : val;

        const inbox = (Array.isArray(conversationsRaw) ? conversationsRaw : []).map(row => ({
            userId: row.userId,
            name: row.name,
            mobile: row.mobile,
            lastMessage: row.lastMessage,
            lastStatus: row.lastStatus,
            lastActivity: row.lastActivity,
            unreadCount: normalize(row.unreadCount)
        }));

        return successResponse(res, 200, 'Inbox retrieved successfully', { inbox });

    } catch (error) {
        console.error("Get Inbox Error:", error);
        return errorResponse(res, 500, 'Failed to retrieve inbox', error.message);
    }
};

module.exports = {
    sendMessage,
    getThread,
    markAsRead,
    getInbox
};
