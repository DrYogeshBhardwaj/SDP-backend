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

// Production Security Trusts (for VPS Reverse Proxy like Nginx)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// CORS
if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [process.env.FRONTEND_URL || 'https://sinaank.com'];

    app.use(cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (!allowedOrigins.includes(origin)) {
                return callback(new Error('CORS blocked'), false);
            }
            return callback(null, true);
        },
        credentials: true
    }));

} else {

    app.use(cors({
        origin: [
            'http://localhost:3000',
            'http://127.0.0.1:5000',
            'http://localhost:5000'
        ],
        credentials: true
    }));
}

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));


// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: 'SDP Backend Running' });
});


// ================================
// FRONTEND STATIC SERVING
// ================================

app.use(express.static(path.join(__dirname, '../../public')));
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));


// ================================
// FRONTEND ROUTES
// ================================

app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/index.html'))
);

app.get('/login', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/login.html'))
);

app.get('/buyer', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/buyer.html'))
);

app.get('/dashboard', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/user.html'))
);

app.get('/seeder', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/seeder.html'))
);

app.get('/admin', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/admin.html'))
);

app.get('/admin.html', (req, res) => res.redirect('/admin'));

app.get('/seeder-form', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/seeder_form.html'))
);

app.get('/seeder-offer', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/seeder_offer.html'))
);

app.get('/join-580', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/join_580.html'))
);

app.get('/invite', (req, res) =>
    res.sendFile(path.join(__dirname, '../../public/invite.html'))
);


// ================================
// API ROUTES
// ================================

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


// ================================
// ERROR HANDLER
// ================================

app.use((err, req, res, next) => {

    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(err.message || 'Internal Error');
    }

    const statusCode = err.status || 500;

    const message =
        process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal Server Error'
            : (err.message || 'Internal Server Error');

    return errorResponse(res, statusCode, message);

});

module.exports = app;
