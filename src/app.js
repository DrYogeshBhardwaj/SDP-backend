const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// 1. Necessary Routes Imports
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


// 2. Production Security
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// Frontend Serve Disabled for Render backend-only deployment
// app.use(express.static(path.join(__dirname, '../../frontend/public'))); ...

// 3. Middlewares
if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [process.env.FRONTEND_URL || 'https://sinaank.com', 'https://test.sinaank.com'];
    app.use(cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
} else {
    // Local development CORS
    app.use(cors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:5000', 'http://localhost:5000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// 4. Register API Routes
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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'SDP Backend Running' });
});

// 5. Central error handler
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

    return res.status(statusCode).json({ success: false, message });
});

module.exports = app;

