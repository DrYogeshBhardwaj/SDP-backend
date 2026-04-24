<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
$TWO_FACTOR_API_KEY = "a3cc24d1-1571-11f1-bcb0-0200cd936042";
$BACKEND_BASE_URL = "https://api.sinaank.com/api"; 

// Support for JSON Body input (as used in join.html)
$json = file_get_contents('php://input');
$input = json_decode($json, true) ?? [];

$action = $_GET['action'] ?? '';

/**
 * Helper to proxy requests to the production Node.js backend
 */
function proxyRequest($url, $data) {
    if (!function_exists('curl_init')) {
        return json_encode(["success" => false, "message" => "CURL not installed on this server"]);
    }
    
    $ch = curl_init($url);
    $payload = json_encode($data);
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For simple server-to-server
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $result = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) return json_encode(["success" => false, "message" => "Proxy Error: $error"]);
    return $result;
}

// ---------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------

if ($action === 'send-otp') {
    $mobile = $_POST['mobile'] ?? ($input['mobile'] ?? '');
    if (!$mobile) {
        echo json_encode(["success" => false, "message" => "Mobile number required"]);
        exit;
    }
    if (strlen($mobile) == 10) $mobile = "91" . $mobile;

    $url = "https://2factor.in/API/V1/{$TWO_FACTOR_API_KEY}/SMS/{$mobile}/AUTOGEN/MKUNDLI_OTP";
    $response = @file_get_contents($url);
    $resData = json_decode($response, true);
    
    if ($resData && $resData['Status'] === 'Success') {
        $_SESSION['2factor_session_id'] = $resData['Details'];
        echo json_encode(["success" => true, "message" => "OTP SENT", "data" => ["sessionId" => $resData['Details']]]);
    } else {
        echo json_encode(["success" => false, "message" => "2Factor Error: " . ($resData['Details'] ?? "Unknown")]);
    }
    exit;
}

if ($action === 'verify-otp') {
    $userOtp = $_POST['otp'] ?? ($input['otp'] ?? '');
    $sessionId = $_SESSION['2factor_session_id'] ?? ($input['sessionId'] ?? '');
    if (!$userOtp || !$sessionId) {
        echo json_encode(["success" => false, "message" => "OTP and SessionID required"]);
        exit;
    }

    $url = "https://2factor.in/API/V1/{$TWO_FACTOR_API_KEY}/SMS/VERIFY/{$sessionId}/{$userOtp}";
    $response = @file_get_contents($url);
    $resData = json_decode($response, true);

    if ($resData && $resData['Status'] === 'Success' && $resData['Details'] === 'OTP Matched') {
        echo json_encode(["success" => true, "message" => "OTP VERIFIED", "token" => "USER_" . time()]);
    } else {
        echo json_encode(["success" => false, "message" => $resData['Details'] ?? "Invalid OTP"]);
    }
    exit;
}

// --- NEW PROXY ACTIONS FOR PAYMENT ---

if ($action === 'create-order') {
    echo proxyRequest($BACKEND_BASE_URL . "/payment/create-order", $input);
    exit;
}

if ($action === 'verify-payment') {
    // Handling alias for "verify" as requested by user
    echo proxyRequest($BACKEND_BASE_URL . "/payment/verify", $input);
    exit;
}

// ---------------------------------------------------------

echo json_encode([
    "success" => true,
    "message" => "SINAANK Production Bridge Active",
    "target" => $BACKEND_BASE_URL
]);
