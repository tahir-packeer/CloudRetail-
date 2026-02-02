# Test Payment Service
Write-Host "`n=== PAYMENT SERVICE TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Starting Payment Service Tests...`n" -ForegroundColor Yellow

$baseUrl = "http://localhost:3005"
$authUrl = "http://localhost:3001"
$orderUrl = "http://localhost:3004"
$cartUrl = "http://localhost:3003"

# Test user credentials
$buyerEmail = "buyer@cloudretail.com"
$buyerPassword = "Buyer@123"

# Login to get token
Write-Host "Logging in as buyer..." -ForegroundColor Yellow
$loginBody = @{
    email = $buyerEmail
    password = $buyerPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$authUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.data.accessToken
    $buyerId = $loginResponse.data.user.id
    Write-Host "Login successful! User ID: $buyerId" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Health Check
Write-Host "`nTest 1: Health Check" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "[PASS] Status: $($response.status)" -ForegroundColor Green
    Write-Host "  Stripe Configured: $($response.stripe)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Health check failed" -ForegroundColor Red
}

# Test 2: Setup cart and create order
Write-Host "`nTest 2: Creating test order..." -ForegroundColor Cyan
try {
    # Clear cart
    Invoke-RestMethod -Uri "$cartUrl/api/cart" `
        -Method Delete `
        -Headers $headers | Out-Null

    # Add item to cart
    $addBody = @{
        productId = 1
        quantity = 1
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$cartUrl/api/cart/items" `
        -Method Post `
        -Body $addBody `
        -Headers $headers | Out-Null

    # Create order
    $orderBody = @{
        shippingAddress = @{
            line1 = "123 Test Street"
            line2 = ""
            city = "Seattle"
            state = "WA"
            postalCode = "98101"
            country = "USA"
        }
        paymentMethod = "card"
    } | ConvertTo-Json -Depth 5

    $orderResponse = Invoke-RestMethod -Uri "$orderUrl/api/orders" `
        -Method Post `
        -Body $orderBody `
        -Headers $headers

    $orderId = $orderResponse.data.order.id
    $orderTotal = $orderResponse.data.order.total

    Write-Host "[PASS] Order Created!" -ForegroundColor Green
    Write-Host "  Order ID: $orderId" -ForegroundColor White
    Write-Host "  Total: `$$orderTotal" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to create order: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Create payment intent
Write-Host "`nTest 3: Create Payment Intent" -ForegroundColor Cyan
try {
    $paymentBody = @{
        orderId = $orderId
    } | ConvertTo-Json

    $paymentResponse = Invoke-RestMethod -Uri "$baseUrl/api/payments/intent" `
        -Method Post `
        -Body $paymentBody `
        -Headers $headers

    $paymentId = $paymentResponse.data.payment.id
    $clientSecret = $paymentResponse.data.clientSecret

    Write-Host "[PASS] Payment Intent Created!" -ForegroundColor Green
    Write-Host "  Payment ID: $paymentId" -ForegroundColor White
    Write-Host "  Status: $($paymentResponse.data.payment.status)" -ForegroundColor White
    Write-Host "  Amount: `$$($paymentResponse.data.payment.amount)" -ForegroundColor White
    Write-Host "  Client Secret: $($clientSecret.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to create payment intent: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

# Test 4: Get payment details
Write-Host "`nTest 4: Get Payment Details" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/payments/$paymentId" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Payment Retrieved!" -ForegroundColor Green
    Write-Host "  Order ID: $($response.data.payment.orderId)" -ForegroundColor White
    Write-Host "  Status: $($response.data.payment.status)" -ForegroundColor White
    Write-Host "  Provider Transaction ID: $($response.data.payment.providerTransactionId.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to get payment details" -ForegroundColor Red
}

# Test 5: Get payment history
Write-Host "`nTest 5: Get Payment History" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/payments/history" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Payment History Retrieved!" -ForegroundColor Green
    Write-Host "  Total Payments: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "  Latest: `$$($response.data[0].amount) - $($response.data[0].status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Failed to get payment history" -ForegroundColor Red
}

# Test 6: Try to create duplicate payment intent
Write-Host "`nTest 6: Prevent Duplicate Payment Intent" -ForegroundColor Cyan
try {
    $paymentBody = @{
        orderId = $orderId
    } | ConvertTo-Json

    $duplicateResponse = Invoke-RestMethod -Uri "$baseUrl/api/payments/intent" `
        -Method Post `
        -Body $paymentBody `
        -Headers $headers
        
    Write-Host "[FAIL] Should have prevented duplicate payment" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "[PASS] Duplicate payment prevented!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected error: $_" -ForegroundColor Red
    }
}

# Test 7: Webhook endpoint availability
Write-Host "`nTest 7: Webhook Endpoint" -ForegroundColor Cyan
try {
    # Just checking if endpoint exists (will fail signature verification)
    Invoke-RestMethod -Uri "$baseUrl/api/payments/webhook" `
        -Method Post `
        -Body '{"test": "data"}' `
        -ContentType "application/json" | Out-Null
    
    Write-Host "[FAIL] Webhook should reject unsigned requests" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "[PASS] Webhook endpoint exists (signature required)" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Webhook endpoint status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== PAYMENT SERVICE TESTS COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nNote: To complete payment testing, use Stripe test cards:" -ForegroundColor Yellow
Write-Host "  Success: 4242 4242 4242 4242" -ForegroundColor Gray
Write-Host "  Decline: 4000 0000 0000 0002" -ForegroundColor Gray
Write-Host "  Test with any future expiry and any 3-digit CVC" -ForegroundColor Gray
