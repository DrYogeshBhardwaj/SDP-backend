const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * SINAANK AI Knowledge Engine
 * Processes user queries and generates instant support replies.
 */
const generateAIResponse = (text, user) => {
    const q = text.toLowerCase();
    const name = user.name ? user.name.split(' ')[0] : 'User';
    let reply = "";

    if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
        reply = `नमस्ते ${name}! मैं Sinaank AI Support हूँ। मैं आपकी क्या मदद कर सकता हूँ? आप अपनी SID, Plans, Income, या किसी भी चीज़ के बारे में पूछ सकते हैं।`;
    } else if (q.includes("sid") || q.includes("sinaank id")) {
        reply = `आपकी Digital SID (${user.sid_id || 'Not Assigned yet'}) एक unique biometric frequency profile है। इसमें आपके लिए specific colors और sounds होते हैं जो therapy में काम आते हैं। आप इसे अपने Dashboard में देख सकते हैं।`;
    } else if (q.includes("plan") || q.includes("join") || q.includes("activate") || q.includes("price")) {
        reply = `Sinaank के दो primary Digital Plans हैं: 
1. **Starter (₹779)**: Lifetime Therapy access and standard referral rewards.
2. **Growth (₹2990)**: 4 Kits, full business rights, and maximum rewards.
क्या आप अपना प्लान अपग्रेड करना चाहते हैं?`;
    } else if (q.includes("income") || q.includes("money") || q.includes("earn") || q.includes("withdrawal") || q.includes("payout")) {
        reply = `आप Sinaank से 3-levels तक referral income कमा सकते हैं। Direct referral पर ₹120 से ₹450 तक मिलते हैं। आप अपने Wallet से कभी भी withdrawal request डाल सकते हैं, जो 2-4 घंटों में approve हो जाती है।`;
    } else if (q.includes("demo") || q.includes("trial") || q.includes("how to use")) {
        reply = `Sinaank को use करना बहुत आसान है: 1. अपना SID profile पूरा करें। 2. कोई भी therapy module सेलेक्ट करें। 3. AI voice के instructions फॉलो करें। यह पूरी तरह digital और automatic है।`;
    } else if (q.includes("referral") || q.includes("invite") || q.includes("link")) {
        reply = `आपका unique referral link आपके Business Dashboard में है। इसे share करके आप अपनी Digital Asset बना सकते हैं। हर जॉइनिंग पर आपको bonus points मिलते हैं।`;
    } else {
        reply = `यह एक अच्छा सवाल है! मैंने आपकी query नोट कर ली है और जल्द ही एक Admin इसे review करेंगे। तब तक आप SID, Plans, या Income के बारे में कुछ भी पूछ सकते हैं।`;
    }

    return `Sinaank AI: ${reply}\n\n(Note: यह एक instant AI जवाब है। अगर आपको और मदद चाहिए, तो Admin जल्द ही आपसे जुड़ेंगे।)`;
};

const sendMessage = async (req, res) => {
    try {
        const { receiverId, content, isVoice } = req.body;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        let actualReceiverId = receiverId;
        if (!actualReceiverId) {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
            if (!admin) return errorResponse(res, 500, 'No administrator found in the system');
            actualReceiverId = admin.id;
        }

        const receiver = await prisma.user.findUnique({ where: { id: actualReceiverId } });
        if (!receiver) return errorResponse(res, 404, 'Receiver not found');

        if (senderRole !== 'ADMIN' && receiver.role !== 'ADMIN') {
            return errorResponse(res, 403, 'Users can only message Administrators');
        }

        // 1. Save original message
        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId: actualReceiverId,
                content,
                status: 'UNREAD',
                type: 'SUPPORT'
            }
        });

        // 2. Trigger AI Instant Reply if receiver is ADMIN and sender is USER
        if (receiver.role === 'ADMIN' && senderRole !== 'ADMIN') {
            const aiContent = generateAIResponse(content, req.user);
            
            // Artificial delay to feel natural
            setTimeout(async () => {
                await prisma.message.create({
                    data: {
                        senderId: actualReceiverId, // Replied as Admin
                        receiverId: senderId,
                        content: aiContent,
                        status: 'UNREAD',
                        isAI: true,
                        type: 'SUPPORT'
                    }
                });
            }, 1000);
        }

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

        if (!targetUserId || targetUserId === 'thread') {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
            if (!admin) return errorResponse(res, 500, 'Administration account not found');
            targetUserId = admin.id;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Larger limit for support chats
        const skip = (page - 1) * limit;

        if (currentUserRole !== 'ADMIN') {
            if (targetUserId !== currentUserId) {
                const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
                if (!targetUser || targetUser.role !== 'ADMIN') {
                    return errorResponse(res, 403, 'Unauthorized thread access');
                }
            }
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: targetUserId },
                    { senderId: targetUserId, receiverId: currentUserId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                sender: { select: { id: true, name: true, role: true } }
            }
        });

        return successResponse(res, 200, 'Thread retrieved successfully', {
            messages: messages.reverse() // Chronological for chat
        });

    } catch (error) {
        console.error("Get Thread Error:", error);
        return errorResponse(res, 500, 'Failed to retrieve thread', error.message);
    }
};

const getInbox = async (req, res) => {
    try {
        const adminId = req.user.id;
        if (req.user.role !== 'ADMIN') return errorResponse(res, 403, 'Unauthorized');

        const conversationsRaw = await prisma.$queryRaw`
            SELECT 
                u.id as "userId",
                u.name,
                u.mobile,
                (SELECT status FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastStatus",
                (SELECT "isAI" FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastMsgIsAI",
                (SELECT "isResolved" FROM "Message" m WHERE (m."senderId" = u.id AND m."receiverId" = ${adminId}) OR (m."receiverId" = u.id AND m."senderId" = ${adminId}) ORDER BY m."createdAt" DESC LIMIT 1) as "lastIsResolved",
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

        const normalize = (val) => typeof val === 'bigint' ? Number(val) : val;

        const inbox = (Array.isArray(conversationsRaw) ? conversationsRaw : []).map(row => ({
            userId: row.userId,
            name: row.name,
            mobile: row.mobile,
            lastMessage: row.lastMessage,
            lastActivity: row.lastActivity,
            unreadCount: normalize(row.unreadCount),
            isAI: row.lastMsgIsAI,
            isResolved: row.lastIsResolved
        }));

        return successResponse(res, 200, 'Inbox retrieved successfully', { inbox });

    } catch (error) {
        console.error("Get Inbox Error:", error);
        return errorResponse(res, 500, 'Failed to retrieve inbox', error.message);
    }
};

const resolveThread = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user.id;
        if (req.user.role !== 'ADMIN') return errorResponse(res, 403, 'Unauthorized');

        await prisma.message.updateMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: adminId },
                    { senderId: adminId, receiverId: userId }
                ]
            },
            data: { isResolved: true, status: 'READ' }
        });

        return successResponse(res, 200, 'Support thread marked as resolved');
    } catch (error) {
        return errorResponse(res, 500, 'Failed to resolve thread', error.message);
    }
};

module.exports = {
    sendMessage,
    getThread,
    getInbox,
    resolveThread
};

