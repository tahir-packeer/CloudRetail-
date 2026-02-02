# Test Analytics Service
Write-Host "`n=== ANALYTICS SERVICE TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Starting Analytics Service Tests...`n" -ForegroundColor Yellow

$baseUrl = "http://localhost:3006"
$authUrl = "http://localhost:3001"

# Test admin credentials
$adminEmail = "admin@cloudretail.com"
$adminPassword = "Admin@123"

# Login as admin to get token
Write-Host "Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$authUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $adminToken = $loginResponse.data.accessToken
    Write-Host "Login successful!" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# Test 1: Health Check
Write-Host "`nTest 1: Health Check" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "[PASS] Status: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Health check failed" -ForegroundColor Red
}

# Test 2: Refresh metrics (populate database)
Write-Host "`nTest 2: Refresh Metrics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/refresh" `
        -Method Post `
        -Headers $headers

    Write-Host "[PASS] Metrics Refreshed!" -ForegroundColor Green
    Write-Host "  Daily Sales Updated: $($response.data.dailySalesUpdated)" -ForegroundColor White
    Write-Host "  Products Updated: $($response.data.productsUpdated)" -ForegroundColor White
    Write-Host "  Sellers Updated: $($response.data.sellersUpdated)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to refresh metrics: $_" -ForegroundColor Red
}

# Test 3: Get Dashboard Metrics
Write-Host "`nTest 3: Get Dashboard Metrics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/dashboard" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Dashboard Retrieved!" -ForegroundColor Green
    Write-Host "  Total Orders: $($response.data.summary.totalOrders)" -ForegroundColor White
    Write-Host "  Total Revenue: `$$($response.data.summary.totalRevenue)" -ForegroundColor White
    Write-Host "  Avg Order Value: `$$([math]::Round($response.data.summary.averageOrderValue, 2))" -ForegroundColor White
    Write-Host "  Successful Payments: $($response.data.summary.successfulPayments)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to get dashboard: $_" -ForegroundColor Red
}

# Test 4: Get Sales Data
Write-Host "`nTest 4: Get Sales Data" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/sales" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Sales Data Retrieved!" -ForegroundColor Green
    Write-Host "  Data Points: $($response.data.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to get sales data: $_" -ForegroundColor Red
}

# Test 5: Get Top Products
Write-Host "`nTest 5: Get Top Products" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/products/top?limit=5" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Top Products Retrieved!" -ForegroundColor Green
    Write-Host "  Products Found: $($response.data.Count)" -ForegroundColor White
    
    if ($response.data.Count -gt 0) {
        Write-Host "  Top Product: $($response.data[0].productName) - `$$($response.data[0].revenue) revenue" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Failed to get top products: $_" -ForegroundColor Red
}

# Test 6: Get Top Sellers
Write-Host "`nTest 6: Get Top Sellers" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/sellers/top?limit=5" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Top Sellers Retrieved!" -ForegroundColor Green
    Write-Host "  Sellers Found: $($response.data.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to get top sellers: $_" -ForegroundColor Red
}

# Test 7: Get Seller Metrics (as seller)
Write-Host "`nTest 7: Get Seller Metrics" -ForegroundColor Cyan

# Login as seller
$sellerEmail = "seller@cloudretail.com"
$sellerPassword = "Seller@123"
$sellerLoginBody = @{
    email = $sellerEmail
    password = $sellerPassword
} | ConvertTo-Json

try {
    $sellerLoginResponse = Invoke-RestMethod -Uri "$authUrl/api/auth/login" `
        -Method Post `
        -Body $sellerLoginBody `
        -ContentType "application/json"
    
    $sellerToken = $sellerLoginResponse.data.accessToken
    $sellerId = $sellerLoginResponse.data.user.id

    $sellerHeaders = @{
        "Authorization" = "Bearer $sellerToken"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/seller/$sellerId" `
        -Method Get `
        -Headers $sellerHeaders

    Write-Host "[PASS] Seller Metrics Retrieved!" -ForegroundColor Green
    Write-Host "  Seller ID: $($response.data.sellerId)" -ForegroundColor White
    Write-Host "  Total Orders: $($response.data.totalOrders)" -ForegroundColor White
    Write-Host "  Total Revenue: `$$($response.data.totalRevenue)" -ForegroundColor White
} catch {
    Write-Host "[INFO] No seller metrics found (expected if seller has no orders)" -ForegroundColor Yellow
}

Write-Host "`n=== ANALYTICS SERVICE TESTS COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nNote: Analytics data is aggregated from existing orders and payments." -ForegroundColor Yellow
Write-Host "Run 'POST /api/analytics/refresh' to update metrics with latest data." -ForegroundColor Gray
