const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/product.routes');
const minutesRoutes = require('./modules/minutes/minutes.routes');
const { errorResponse } = require('./utils/response');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Adjust origin in production
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/minutes', minutesRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'SDP Backend Running' });
});

// Central error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    return errorResponse(res, 500, 'Internal Server Error', err);
});

module.exports = app;
