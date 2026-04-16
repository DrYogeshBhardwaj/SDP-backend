require('dotenv').config();
console.log("[SERVER] ENV KEYS STARTING WITH RAZORPAY_:", Object.keys(process.env).filter(k => k.startsWith('RAZORPAY')));
console.log("[SERVER] ENV LOADED. KEY_ID:", process.env.RAZORPAY_KEY_ID ? "PRESENT" : "MISSING");
console.log("[SERVER] KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "PRESENT" : "MISSING");

console.log("SERVER STARTING...");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const otpRoutes = require('./modules/auth/otp.routes');
const productRoutes = require('./modules/products/product.routes');
const minutesRoutes = require('./modules/minutes/minutes.routes');
const seederRoutes = require('./modules/seeder/seeder.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const expenseRoutes = require('./modules/admin/expense.routes');
const messageRoutes = require('./modules/communication/message.routes');
const announcementRoutes = require('./modules/communication/announcement.routes');
const adminAnnouncementRoutes = require('./modules/communication/admin.announcement.routes');
const exportRoutes = require('./modules/admin/export.routes');
const referralRoutes = require('./modules/referral/referral.routes');

const paymentRoutes = require('./routes/payment.routes');

const { errorResponse } = require('./utils/response');
const minutesController = require('./modules/minutes/minutes.controller');

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://sinaank.com',
    'https://www.sinaank.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', (req, res, next) => {
    if (req.method === 'POST') {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return errorResponse(res, 400, 'Content-Type must be application/json');
        }
    }
    next();
});

app.use(cookieParser());
app.use(morgan('dev'));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
            frameSrc: ["'self'", "https://api.razorpay.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://2factor.in"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use("/api/payment", require("./routes/payment.routes"));

app.use('/public', express.static(path.join(__dirname, "../public")));
app.use('/assets', express.static(path.join(__dirname, "../assets")));
app.use('/dashboard', express.static(path.join(__dirname, "../dashboard")));
app.use(express.static(path.join(__dirname, "../public")));

app.use('/api/auth', authRoutes);
app.use('/api/auth', otpRoutes);
app.use('/api/products', productRoutes);
app.use('/api/minutes', minutesRoutes);
app.use('/api/seeder', seederRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/admin/expenses', expenseRoutes);
app.use('/api/admin/export', exportRoutes);
app.use('/api/admin/announcements', adminAnnouncementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/payment', paymentRoutes);

app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return errorResponse(res, statusCode, message);
});

app.get('/api/debug-ping', (req, res) => {
    return res.json({ status: "ANTIGRAVITY_PING_OK", env: process.env.NODE_ENV || 'development' });
});

setInterval(() => {
    minutesController.autoAbandonSessions();
}, 60 * 1000);

setInterval(async () => {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await prisma.rateLimit.deleteMany({
            where: { createdAt: { lt: yesterday } }
        });
        if (result.count > 0) {
            console.log(`Cleanup: Deleted ${result.count} old rate limit records.`);
        }
    } catch (e) {
        console.error('Cleanup Error:', e);
    }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
