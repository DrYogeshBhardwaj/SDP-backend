<?php
/**
 * SINAANK Diagnostic Tool
 * Visit this file in your browser: yourdomain.com/diag.php
 */

header("Content-Type: text/html; charset=UTF-8");

echo "<html><head><title>Sinaank Diagnostic</title>";
echo "<style>body{font-family:sans-serif; line-height:1.6; padding:40px; background:#f8fafc;} .card{background:white; padding:30px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.05); max-width:800px; margin:auto;} .success{color:#10b981; font-weight:bold;} .error{color:#ef4444; font-weight:bold;} .info{background:#f1f5f9; padding:15px; border-radius:10px; margin:10px 0; font-family:monospace; white-space:pre-wrap;}</style>";
echo "</head><body><div class='card'>";
echo "<h1>SINAANK System Diagnostic</h1>";

// 1. PHP Version
echo "<p><b>1. PHP Version:</b> " . PHP_VERSION . " ";
if (version_compare(PHP_VERSION, '7.0.0') >= 0) {
    echo "<span class='success'>[PASS]</span>";
} else {
    echo "<span class='error'>[FAIL - Recommend 7.4+]</span>";
}
echo "</p>";

// 2. CURL Check
echo "<p><b>2. CURL Extension:</b> ";
if (function_exists('curl_init')) {
    echo "<span class='success'>[INSTALLED]</span>";
} else {
    echo "<span class='error'>[MISSING - Contact MilesWeb Support to enable CURL]</span>";
}
echo "</p>";

// 3. Remote Backend Connectivity
$test_url = "https://api.sinaank.com/api/auth/me";
echo "<p><b>3. Testing Remote API Connectivity:</b> <br>Target: <small>$test_url</small></p>";

if (function_exists('curl_init')) {
    $ch = curl_init($test_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($curl_error) {
        echo "<div class='info error'>CURL ERROR: $curl_error\n\nPossible Reason: Your Hosting provider is blocking outgoing connections to this URL.</div>";
    } else {
        echo "<p>Response Code: <b>$httpCode</b> ";
        if ($httpCode >= 200 && $httpCode < 500) {
            echo "<span class='success'>[CONNECTION SUCCESSFUL]</span>";
        } else {
            echo "<span class='error'>[SERVER ERROR - $httpCode]</span>";
        }
        echo "</p>";
        echo "<div class='info'>Raw Response: " . htmlspecialchars(substr($response, 0, 500)) . "...</div>";
    }
}

// 4. Headers Check
echo "<p><b>4. Header Function Support:</b> ";
if (function_exists('getallheaders')) {
    echo "<span class='success'>[NATIVE SUPPORT]</span>";
} else {
    echo "<span class='info'>[USING POLYFILL - OK for Bridge]</span>";
}
echo "</p>";

echo "<h3>Recommendation:</h3>";
echo "<ul>
    <li>If <b>CURL Error</b> shows, contact MilesWeb support and ask them to 'Whitelist outgoing connections to api.sinaank.com'.</li>
    <li>If <b>Connection Successful</b> but site still shows Network Error, check if you uploaded <b>config.js</b> to the <code>js/</code> folder correctly.</li>
</ul>";

echo "</div></body></html>";
?>
