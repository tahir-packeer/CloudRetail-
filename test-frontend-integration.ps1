# CloudRetail Frontend Integration Test Script
Write-Host "=== CLOUDRETAIL FRONTEND INTEGRATION TESTS ===" -ForegroundColor Cyan
Write-Host ""

$gatewayUrl = "http://localhost:3000"
$frontendUrl = "http://localhost:5173"

# Test 1: Frontend Accessibility
Write-Host "`nTest 1: Frontend Server" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] Frontend is accessible at $frontendUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Frontend not accessible: $_" -ForegroundColor Red
}

# Test 2: API Gateway Health
Write-Host "`nTest 2: Gateway & Backend Services" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$gatewayUrl/health"
    if ($health.status -eq "healthy") {
        Write-Host "[PASS] API Gateway is healthy" -ForegroundColor Green
        Write-Host "  Services:" -ForegroundColor Gray
        $health.services.PSObject.Properties | ForEach-Object {
            Write-Host "    $($_.Name): $($_.Value.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[FAIL] Gateway health check failed: $_" -ForegroundColor Red
}

# Test 3: User Login Flow
Write-Host "`nTest 3: Login Functionality" -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "buyer@cloudretail.com"
        password = "Buyer@123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$gatewayUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"

    if ($loginResponse.success) {
        $token = $loginResponse.data.accessToken
        Write-Host "[PASS] Buyer login successful" -ForegroundColor Green
        Write-Host "  User: $($loginResponse.data.user.email)" -ForegroundColor Gray
        Write-Host "  Role: $($loginResponse.data.user.role)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
}

# Test 4: Product Search (Buyer Journey)
Write-Host "`nTest 4: Product Catalog" -ForegroundColor Cyan
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $products = Invoke-RestMethod -Uri "$gatewayUrl/api/products/search?page=1&limit=5" `
        -Method Get `
        -Headers $headers

    if ($products.success) {
        Write-Host "[PASS] Product search successful" -ForegroundColor Green
        Write-Host "  Products found: $($products.data.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Product search failed: $_" -ForegroundColor Red
}

# Test 5: Cart Operations
Write-Host "`nTest 5: Shopping Cart" -ForegroundColor Cyan
try {
    $cart = Invoke-RestMethod -Uri "$gatewayUrl/api/cart" `
        -Method Get `
        -Headers $headers

    if ($cart.success) {
        Write-Host "[PASS] Cart retrieval successful" -ForegroundColor Green
        Write-Host "  Cart items: $($cart.data.cart.items.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Cart retrieval failed: $_" -ForegroundColor Red
}

# Test 6: Seller Login & Dashboard
Write-Host "`nTest 6: Seller Dashboard Access" -ForegroundColor Cyan
try {
    $sellerLoginBody = @{
        email = "seller@cloudretail.com"
        password = "Seller@123"
    } | ConvertTo-Json

    $sellerLogin = Invoke-RestMethod -Uri "$gatewayUrl/api/auth/login" `
        -Method Post `
        -Body $sellerLoginBody `
        -ContentType "application/json"

    if ($sellerLogin.success) {
        $sellerToken = $sellerLogin.data.accessToken
        $sellerHeaders = @{ "Authorization" = "Bearer $sellerToken" }
        
        # Try to access seller orders
        $sellerOrders = Invoke-RestMethod -Uri "$gatewayUrl/api/orders/seller-orders" `
            -Method Get `
            -Headers $sellerHeaders

        if ($sellerOrders.success) {
            Write-Host "[PASS] Seller dashboard accessible" -ForegroundColor Green
            Write-Host "  Seller: $($sellerLogin.data.user.email)" -ForegroundColor Gray
            Write-Host "  Orders: $($sellerOrders.data.orders.Count)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[FAIL] Seller dashboard access failed: $_" -ForegroundColor Red
}

# Test 7: Admin Panel Access
Write-Host "`nTest 7: Admin Panel Access" -ForegroundColor Cyan
try {
    $adminLoginBody = @{
        email = "admin@cloudretail.com"
        password = "Admin@123"
    } | ConvertTo-Json

    $adminLogin = Invoke-RestMethod -Uri "$gatewayUrl/api/auth/login" `
        -Method Post `
        -Body $adminLoginBody `
        -ContentType "application/json"

    if ($adminLogin.success) {
        $adminToken = $adminLogin.data.accessToken
        $adminHeaders = @{ "Authorization" = "Bearer $adminToken" }
        
        # Try to access analytics dashboard
        $analytics = Invoke-RestMethod -Uri "$gatewayUrl/api/analytics/dashboard" `
            -Method Get `
            -Headers $adminHeaders

        if ($analytics.success) {
            Write-Host "[PASS] Admin panel accessible" -ForegroundColor Green
            Write-Host "  Total Orders: $($analytics.data.totalOrders)" -ForegroundColor Gray
            Write-Host "  Total Revenue: `$$($analytics.data.totalRevenue)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[FAIL] Admin panel access failed: $_" -ForegroundColor Red
}

Write-Host "`n=== INTEGRATION TESTS COMPLETED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor White
Write-Host "API Gateway: $gatewayUrl" -ForegroundColor White
Write-Host ""
Write-Host "Test Accounts:" -ForegroundColor Yellow
Write-Host "  Buyer:  buyer@cloudretail.com / Buyer@123" -ForegroundColor Gray
Write-Host "  Seller: seller@cloudretail.com / Seller@123" -ForegroundColor Gray
Write-Host "  Admin:  admin@cloudretail.com / Admin@123" -ForegroundColor Gray
Write-Host ""
