require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Preserve all route module requirements from /src/
const authRoutes = require('./src/modules/auth/auth.routes');
const otpRoutes = require('./src/modules/auth/otp.routes');
const productRoutes = require('./src/modules/products/product.routes');
const minutesRoutes = require('./src/modules/minutes/minutes.routes');
const seederRoutes = require('./src/modules/seeder/seeder.routes');
const financeRoutes = require('./src/modules/finance/finance.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');
const expenseRoutes = require('./src/modules/admin/expense.routes');
const messageRoutes = require('./src/modules/communication/message.routes');
const announcementRoutes = require('./src/modules/communication/announcement.routes');
const adminAnnouncementRoutes = require('./src/modules/communication/admin.announcement.routes');
const exportRoutes = require('./src/modules/admin/export.routes');
const { errorResponse } = require('./src/utils/response');

const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

// Serve frontend statically from the public folder (EXACT ROOT STRUCTURE MATCH)
// DYNAMIC FLUSH CACHE COMMIT: 2024-03-07T16:35:00Z
console.log("Serving static from:", path.join(__dirname, "public"));
app.use(express.static(path.join(__dirname, "public")));

// Production Security Trusts (for VPS Reverse Proxy like Nginx)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Middlewares
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// HEALTH CHECK (Placed at the very top to bypass all custom router middlewares)
app.get('/api/health', (req, res) => {
    res.json({ status: 'SDP Backend Running' });
});

// Routes (Inheriting from the /src/ subdirectory modules identically to before)
app.use('/api/auth', authRoutes);
app.use('/api', otpRoutes);
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

// Fallback to exactly public/index.html internally as requested
app.use((req, res, next) => {
    // Prevent overriding of standard API routes natively if an endpoint genuinely crashes
    if (req.originalUrl.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


// Central error handler
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(err.message || 'Internal Error');
    }

    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : (err.message || 'Internal Server Error');

    return errorResponse(res, statusCode, message);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
