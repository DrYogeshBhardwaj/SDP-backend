<?php
/**
 * 2Factor OTP Verification Gateway for Shared Hosting
 * Verifies the OTP entered by the user against the 2Factor Session.
 */
header('Content-Type: application/json');

// 1. Get Parameters
$otp = $_REQUEST['otp'] ?? '';
$sessionId = $_REQUEST['session'] ?? '';

if (!$otp || !$sessionId) {
    echo json_encode(["Status" => "Error", "Details" => "Missing parameters"]);
    exit;
}

// 2. Configuration
$apiKey = "a3cc24d1-1571-11f1-bcb0-0200cd936042"; // Your 2Factor API Key

/**
 * 3. Verification URL
 * Format: SMS / VERIFY / session_id / otp_value
 */
$url = "https://2factor.in/API/V1/$apiKey/SMS/VERIFY/$sessionId/$otp";

// 4. API Call
$response = @file_get_contents($url);
$data = json_decode($response, true);

// 5. Response handling
if ($data && $data['Status'] === 'Success' && $data['Details'] === 'OTP Matched') {
    echo json_encode([
        "Status" => "Success",
        "Details" => "Verification Successful"
    ]);
} else {
    echo json_encode([
        "Status" => "Error",
        "Details" => $data['Details'] ?? "Verification Failed",
        "api" => $response
    ]);
}

exit;
?>
