const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        if (!receiverId || !content) {
            return errorResponse(res, 400, 'Receiver ID and content are required');
        }

        // Validate receiver
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId }
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
                receiverId,
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
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

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

module.exports = {
    sendMessage,
    getThread,
    markAsRead
};
