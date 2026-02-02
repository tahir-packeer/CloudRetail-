# Test Order Service
Write-Host "`n=== ORDER SERVICE TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Starting Order Service Tests...`n" -ForegroundColor Yellow

$baseUrl = "http://localhost:3004"
$authUrl = "http://localhost:3001"
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
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
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
} catch {
    Write-Host "[FAIL] Health check failed" -ForegroundColor Red
}

# Test 2: Get empty orders list
Write-Host "`nTest 2: Get Orders (Empty)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders/my-orders" `
        -Method Get `
        -Headers $headers
    Write-Host "[PASS] Orders: $($response.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to get orders" -ForegroundColor Red
}

# Test 3: Setup cart with items
Write-Host "`nTest 3: Setting up cart with items..." -ForegroundColor Cyan
try {
    # Clear cart first
    Invoke-RestMethod -Uri "$cartUrl/api/cart" `
        -Method Delete `
        -Headers $headers | Out-Null

    # Add first item
    $addBody1 = @{
        productId = 1
        quantity = 2
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$cartUrl/api/cart/items" `
        -Method Post `
        -Body $addBody1 `
        -Headers $headers | Out-Null

    # Add second item
    $addBody2 = @{
        productId = 2
        quantity = 1
    } | ConvertTo-Json
    
    $cartResponse = Invoke-RestMethod -Uri "$cartUrl/api/cart/items" `
        -Method Post `
        -Body $addBody2 `
        -Headers $headers

    Write-Host "[PASS] Cart ready with $($cartResponse.data.cart.itemCount) items" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to setup cart: $_" -ForegroundColor Red
}

# Test 4: Create order from cart
Write-Host "`nTest 4: Create Order from Cart" -ForegroundColor Cyan
try {
    $orderBody = @{
        shippingAddress = @{
            line1 = "123 Main Street"
            line2 = "Apt 4B"
            city = "Seattle"
            state = "WA"
            postalCode = "98101"
            country = "USA"
        }
        billingAddress = @{
            line1 = "123 Main Street"
            line2 = "Apt 4B"
            city = "Seattle"
            state = "WA"
            postalCode = "98101"
            country = "USA"
        }
        paymentMethod = "card"
    } | ConvertTo-Json -Depth 5

    $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders" `
        -Method Post `
        -Body $orderBody `
        -Headers $headers

    $orderId = $orderResponse.data.order.id
    $orderNumber = $orderResponse.data.order.orderNumber
    $total = $orderResponse.data.order.total

    Write-Host "[PASS] Order Created!" -ForegroundColor Green
    Write-Host "  Order ID: $orderId" -ForegroundColor White
    Write-Host "  Order Number: $orderNumber" -ForegroundColor White
    Write-Host "  Total: `$$total" -ForegroundColor White
    Write-Host "  Items: $($orderResponse.data.order.items.Count)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to create order: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

# Test 5: Get order by ID
Write-Host "`nTest 5: Get Order by ID" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Order Retrieved!" -ForegroundColor Green
    Write-Host "  Status: $($response.data.order.status)" -ForegroundColor White
    Write-Host "  Payment Status: $($response.data.order.paymentStatus)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to get order" -ForegroundColor Red
}

# Test 6: Get order history
Write-Host "`nTest 6: Get Order Status History" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId/history" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] History Retrieved!" -ForegroundColor Green
    Write-Host "  History Entries: $($response.data.history.Count)" -ForegroundColor White
    foreach ($entry in $response.data.history) {
        Write-Host "  - $($entry.status): $($entry.notes)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Failed to get order history" -ForegroundColor Red
}

# Test 7: Get all user orders
Write-Host "`nTest 7: Get All User Orders" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders/my-orders" `
        -Method Get `
        -Headers $headers

    Write-Host "[PASS] Orders List Retrieved!" -ForegroundColor Green
    Write-Host "  Total Orders: $($response.data.Count)" -ForegroundColor White
    Write-Host "  Total Amount: `$$($response.data[0].total)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to get user orders" -ForegroundColor Red
}

# Test 8: Verify cart was cleared
Write-Host "`nTest 8: Verify Cart Cleared After Order" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$cartUrl/api/cart" `
        -Method Get `
        -Headers $headers

    if ($response.data.cart.itemCount -eq 0) {
        Write-Host "[PASS] Cart cleared! Items: $($response.data.cart.itemCount)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Cart not cleared! Items: $($response.data.cart.itemCount)" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Failed to check cart" -ForegroundColor Red
}

# Test 9: Login as seller and update order status
Write-Host "`nTest 9: Update Order Status (Seller)" -ForegroundColor Cyan
try {
    # Login as seller
    $sellerLoginBody = @{
        email = "seller@cloudretail.com"
        password = "Seller@123"
    } | ConvertTo-Json

    $sellerLoginResponse = Invoke-RestMethod -Uri "$authUrl/api/auth/login" `
        -Method Post `
        -Body $sellerLoginBody `
        -ContentType "application/json"
    
    $sellerToken = $sellerLoginResponse.data.accessToken
    $sellerHeaders = @{
        "Authorization" = "Bearer $sellerToken"
        "Content-Type" = "application/json"
    }

    # Update order status
    $statusBody = @{
        status = "processing"
        notes = "Order is being prepared"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId/status" `
        -Method Patch `
        -Body $statusBody `
        -Headers $sellerHeaders

    Write-Host "[PASS] Order Status Updated!" -ForegroundColor Green
    Write-Host "  New Status: $($response.data.order.status)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Failed to update order status: $_" -ForegroundColor Red
}

Write-Host "`n=== ALL TESTS COMPLETED ===" -ForegroundColor Cyan
