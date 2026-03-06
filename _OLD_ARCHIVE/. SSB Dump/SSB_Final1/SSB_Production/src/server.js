const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const paymentController = require('./paymentController');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.post('/api/create-order', paymentController.createOrder);
app.post('/api/verify-payment', paymentController.verifyPayment);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Razorpay Key ID loaded: ${process.env.RAZORPAY_KEY_ID ? 'Yes' : 'No'}`);
});
