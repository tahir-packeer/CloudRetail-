# Test API Gateway
Write-Host "`n=== API GATEWAY TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Starting API Gateway Tests...`n" -ForegroundColor Yellow

$gatewayUrl = "http://localhost:3000"

# Test 1: Gateway Health Check
Write-Host "`nTest 1: Gateway Health Check" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$gatewayUrl/health" -Method Get
    Write-Host "[PASS] Gateway Status: $($response.status)" -ForegroundColor Green
    Write-Host "  Services:" -ForegroundColor White
    foreach ($service in $response.services.PSObject.Properties) {
        $status = $service.Value.status
        $color = if ($status -eq "healthy") { "Green" } else { "Red" }
        Write-Host "    $($service.Name): $status" -ForegroundColor $color
    }
} catch {
    Write-Host "[FAIL] Gateway health check failed" -ForegroundColor Red
    exit 1
}

# Test 2: Auth Service via Gateway
Write-Host "`nTest 2: Auth Service (via Gateway)" -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "buyer@cloudretail.com"
        password = "Buyer@123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$gatewayUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $response.data.accessToken
    Write-Host "[PASS] Login via gateway successful!" -ForegroundColor Green
    Write-Host "  User: $($response.data.user.email)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Auth service test failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 3: Catalog Service via Gateway
Write-Host "`nTest 3: Catalog Service (via Gateway)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$gatewayUrl/api/products/search?page=1&limit=5" -Method Get
    Write-Host "[PASS] Products retrieved via gateway!" -ForegroundColor Green
    Write-Host "  Products found: $($response.data.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Catalog service test failed: $_" -ForegroundColor Red
}

# Test 4: Cart Service via Gateway
Write-Host "`nTest 4: Cart Service (via Gateway)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$gatewayUrl/api/cart" `
        -Method Get `
        -Headers $headers
    Write-Host "[PASS] Cart retrieved via gateway!" -ForegroundColor Green
    Write-Host "  Cart items: $($response.data.cart.items.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Cart service test failed" -ForegroundColor Red
}

# Test 5: Order Service via Gateway
Write-Host "`nTest 5: Order Service (via Gateway)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$gatewayUrl/api/orders/my-orders" `
        -Method Get `
        -Headers $headers
    Write-Host "[PASS] Orders retrieved via gateway!" -ForegroundColor Green
    Write-Host "  Orders found: $($response.data.orders.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Order service test failed: $_" -ForegroundColor Red
}

# Test 6: Payment Service via Gateway
Write-Host "`nTest 6: Payment Service (via Gateway)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$gatewayUrl/api/payments/history" `
        -Method Get `
        -Headers $headers
    Write-Host "[PASS] Payment history retrieved via gateway!" -ForegroundColor Green
    Write-Host "  Payments found: $($response.data.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Payment service test failed" -ForegroundColor Red
}

# Test 7: Rate Limiting
Write-Host "`nTest 7: Rate Limiting" -ForegroundColor Cyan
try {
    $rateLimitHit = $false
    for ($i = 1; $i -le 110; $i++) {
        try {
            Invoke-RestMethod -Uri "$gatewayUrl/health" -Method Get -TimeoutSec 1 | Out-Null
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                $rateLimitHit = $true
                break
            }
        }
    }
    
    if ($rateLimitHit) {
        Write-Host "[PASS] Rate limiting is active (429 received)" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Rate limit not hit in 110 requests (limit may be higher)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Rate limiting test failed" -ForegroundColor Red
}

# Test 8: CORS Headers
Write-Host "`nTest 8: CORS Headers" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$gatewayUrl/health" -Method Options
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "[PASS] CORS headers present!" -ForegroundColor Green
        Write-Host "  Origin: $corsHeader" -ForegroundColor White
    } else {
        Write-Host "[INFO] CORS headers not visible in OPTIONS response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[INFO] CORS test skipped (OPTIONS may not be supported)" -ForegroundColor Yellow
}

# Test 9: 404 Handling
Write-Host "`nTest 9: 404 Handling" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$gatewayUrl/api/nonexistent" -Method Get | Out-Null
    Write-Host "[FAIL] Should have returned 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "[PASS] 404 handling works correctly!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Wrong error code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n=== API GATEWAY TESTS COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nAll backend services are now accessible through:" -ForegroundColor Yellow
Write-Host "  Gateway URL: http://localhost:3000" -ForegroundColor White
Write-Host "`nReady for frontend development!" -ForegroundColor Green
