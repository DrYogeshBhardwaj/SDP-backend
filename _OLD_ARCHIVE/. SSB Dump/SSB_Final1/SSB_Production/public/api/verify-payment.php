<?php
header('Content-Type: application/json');

// 1. Load Configuration
$config = require 'config.php';
$keySecret = $config['RAZORPAY_KEY_SECRET'];

if (empty($keySecret) || $keySecret === 'YOUR_LIVE_KEY_SECRET_HERE') {
    http_response_code(500);
    echo JSON_encode(['status' => 'failure', 'message' => 'Server Configuration Error']);
    exit;
}

// 2. Get Input Data
$input = JSON_decode(file_get_contents('php://input'), true);
$orderId = $input['razorpay_order_id'] ?? '';
$paymentId = $input['razorpay_payment_id'] ?? '';
$signature = $input['razorpay_signature'] ?? '';

if (empty($orderId) || empty($paymentId) || empty($signature)) {
    http_response_code(400);
    echo JSON_encode(['status' => 'failure', 'message' => 'Missing Payment Details']);
    exit;
}

// 3. Verify Signature
// Hash of (order_id + "|" + payment_id) using Key Secret
$generatedSignature = hash_hmac('sha256', $orderId . "|" . $paymentId, $keySecret);

if ($generatedSignature === $signature) {
    // SUCCESS
    echo JSON_encode(['status' => 'success']);
} else {
    // FAILURE
    http_response_code(400);
    echo JSON_encode(['status' => 'failure', 'message' => 'Invalid Header Signature']);
}
?>