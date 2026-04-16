<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// Support for JSON Body input (as used in join.html)
$json = file_get_contents('php://input');
$input = json_decode($json, true) ?? [];

$action = $_GET['action'] ?? '';
$apiKey = "a3cc24d1-1571-11f1-bcb0-0200cd936042"; // SINAANK 2Factor API Key

if ($action === 'send-otp') {
    $mobile = $_POST['mobile'] ?? ($input['mobile'] ?? '');

    if (!$mobile) {
        echo json_encode(["success" => false, "message" => "Mobile number required"]);
        exit;
    }

    // Ensure 91 prefix for 2Factor
    if (strlen($mobile) == 10) {
        $mobile = "91" . $mobile;
    }

    // Call 2Factor API to send real SMS - STRICT AUTOGEN ENDPOINT
    $url = "https://2factor.in/API/V1/{$apiKey}/SMS/{$mobile}/AUTOGEN/MKUNDLI_OTP";
    
    $response = @file_get_contents($url);
    
    // Debug Log
    error_log("2Factor Send Response: " . $response);

    $resData = json_decode($response, true);
    $sessionId = $resData['Details'] ?? null;

    if ($resData && $resData['Status'] === 'Success') {
        $_SESSION['2factor_session_id'] = $sessionId;
        $_SESSION['mobile'] = $mobile;
        
        echo json_encode([
            "success" => true,
            "message" => "OTP SENT",
            "debug_response" => $resData,
            "data" => [
                "sessionId" => $sessionId
            ]
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "2Factor Error: " . ($resData['Details'] ?? "Unknown Error"),
            "debug_response" => $resData
        ]);
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

    // Verify via 2Factor Endpoint
    $url = "https://2factor.in/API/V1/{$apiKey}/SMS/VERIFY/{$sessionId}/{$userOtp}";
    $response = @file_get_contents($url);
    
    error_log("2Factor Verify Response: " . $response);
    $resData = json_decode($response, true);

    if ($resData && $resData['Status'] === 'Success' && $resData['Details'] === 'OTP Matched') {
        echo json_encode([
            "success" => true,
            "message" => "OTP VERIFIED",
            "token" => "USER_" . time(),
            "debug_response" => $resData
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => $resData['Details'] ?? "Invalid OTP",
            "debug_response" => $resData
        ]);
    }
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "SINAANK Production Bridge Active"
]);
