const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
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
const { errorResponse } = require('./utils/response');

const app = express();

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

// Next line starts Routes //
// Routes
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

module.exports = app;