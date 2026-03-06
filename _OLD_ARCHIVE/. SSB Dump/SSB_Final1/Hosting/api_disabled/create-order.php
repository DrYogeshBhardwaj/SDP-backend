<?php
header('Content-Type: application/json');

// 1. Load Configuration
$config = require 'config.php';
$keyId = trim($config['RAZORPAY_KEY_ID']);
$keySecret = trim($config['RAZORPAY_KEY_SECRET']);

// Check Keys
if ($keyId === 'YOUR_LIVE_KEY_ID_HERE' || empty($keyId) || empty($keySecret)) {
    http_response_code(500);
    echo JSON_encode(['error' => 'Razorpay configuration missing on server']);
    exit;
}

// 2. Get Input Data
$input = JSON_decode(file_get_contents('php://input'), true);
$productId = $input['productId'] ?? null;

// Product Map (Keep in sync with Frontend)
$products = [
    'KIT1' => ['amount' => 17800, 'name' => 'SSB Kit 1'],
    'KIT2' => ['amount' => 32000, 'name' => 'SSB Mix Kit'],
    'KIT3' => ['amount' => 68800, 'name' => 'SSB Family Kit']
];

if (!$productId || !isset($products[$productId])) {
    http_response_code(400);
    echo JSON_encode(['error' => 'Invalid Product ID']);
    exit;
}

$product = $products[$productId];

// 3. Create Order via Razorpay API (Direct cURL)
$url = "https://api.razorpay.com/v1/orders";
$data = [
    "amount" => $product['amount'],
    "currency" => "INR",
    "receipt" => "rcpt_" . uniqid(),
    "payment_capture" => 1
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_USERPWD, $keyId . ":" . $keySecret);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(500);
    echo JSON_encode(['error' => 'Razorpay Order Creation Failed: ' . $response]);
    exit;
}

// 4. Return Order Details to Frontend
$order = JSON_decode($response, true);

echo JSON_encode([
    'order_id' => $order['id'],
    'amount' => $order['amount'],
    'currency' => $order['currency'],
    'key_id' => $keyId, // Pass key to frontend for initialization
    'product_name' => $product['name']
]);
?>