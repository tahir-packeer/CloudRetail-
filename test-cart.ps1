# Test Cart Service
Write-Host "=== CloudRetail Cart Service Tests ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3003"

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "[PASS] Health check successful" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Login as buyer to get token
Write-Host "Getting buyer authentication token..." -ForegroundColor Yellow
$loginData = @{
    email = "buyer@cloudretail.com"
    password = "Buyer@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $buyerId = $loginResponse.data.user.id
    Write-Host "[PASS] Buyer logged in, ID: $buyerId" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Buyer login failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

$headers = @{ Authorization = "Bearer $token" }

# Test 2: Get Empty Cart
Write-Host "Test 2: Get Empty Cart" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart" -Method Get -Headers $headers
    Write-Host "[PASS] Empty cart retrieved" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Get cart failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Add Item to Cart
Write-Host "Test 3: Add Item to Cart" -ForegroundColor Yellow
$addItemData = @{
    productId = 1
    quantity = 2
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart/items" -Method Post -Body $addItemData -ContentType "application/json" -Headers $headers
    Write-Host "[PASS] Item added to cart" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Add item failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Add Another Item
Write-Host "Test 4: Add Another Item" -ForegroundColor Yellow
$addItemData2 = @{
    productId = 2
    quantity = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart/items" -Method Post -Body $addItemData2 -ContentType "application/json" -Headers $headers
    Write-Host "[PASS] Second item added" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Add second item failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Cart with Items
Write-Host "Test 5: Get Cart with Items" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart" -Method Get -Headers $headers
    Write-Host "[PASS] Cart retrieved with items" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.items.Count), Total: $($response.data.cart.total)" -ForegroundColor Gray
    if ($response.data.cart.items.Count -gt 0) {
        Write-Host "First item: $($response.data.cart.items[0].product.name) x $($response.data.cart.items[0].quantity)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Get cart with items failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Update Item Quantity
Write-Host "Test 6: Update Item Quantity" -ForegroundColor Yellow
$updateData = @{
    quantity = 5
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart/items/1" -Method Put -Body $updateData -ContentType "application/json" -Headers $headers
    Write-Host "[PASS] Item quantity updated" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Update quantity failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Validate Cart
Write-Host "Test 7: Validate Cart" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart/validate" -Method Get -Headers $headers
    Write-Host "[PASS] Cart validated" -ForegroundColor Green
    Write-Host "Valid: $($response.data.valid), Errors: $($response.data.errors.Count)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Validate cart failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Remove Item from Cart
Write-Host "Test 8: Remove Item from Cart" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart/items/2" -Method Delete -Headers $headers
    Write-Host "[PASS] Item removed from cart" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Remove item failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 9: Clear Cart
Write-Host "Test 9: Clear Cart" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cart" -Method Delete -Headers $headers
    Write-Host "[PASS] Cart cleared" -ForegroundColor Green
    Write-Host "Items: $($response.data.cart.itemCount), Total: $($response.data.cart.total)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Clear cart failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Cart Service Tests Complete ===" -ForegroundColor Cyan
