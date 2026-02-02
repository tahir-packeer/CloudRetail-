# Test Catalog Service
Write-Host "=== CloudRetail Catalog Service Tests ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3002"

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

# Login as seller to get token
Write-Host "Getting seller authentication token..." -ForegroundColor Yellow
$loginData = @{
    email = "seller@cloudretail.com"
    password = "Seller@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $sellerId = $loginResponse.data.user.id
    Write-Host "[PASS] Seller logged in, ID: $sellerId" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Seller login failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Get All Categories
Write-Host "Test 2: Get All Categories" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/categories" -Method Get
    Write-Host "[PASS] Retrieved $($response.data.Count) categories" -ForegroundColor Green
    if ($response.data.Count -gt 0) {
        Write-Host "First category: $($response.data[0].name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Get categories failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get Category Tree
Write-Host "Test 3: Get Category Tree" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/categories/tree" -Method Get
    Write-Host "[PASS] Retrieved category tree with $($response.data.Count) root categories" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Get category tree failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Create Product (Seller)
Write-Host "Test 4: Create Product (Seller)" -ForegroundColor Yellow
$productData = @{
    sellerId = $sellerId
    categoryId = 1
    name = "Test Product $(Get-Date -Format 'HHmmss')"
    description = "This is a test product created by automated tests"
    price = 99.99
    stock = 100
    sku = "TEST-$(Get-Date -Format 'HHmmss')"
    status = "active"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method Post -Body $productData -ContentType "application/json" -Headers $headers
    $productId = $response.data.product.id
    Write-Host "[PASS] Product created with ID: $productId" -ForegroundColor Green
    Write-Host "Product: $($response.data.product.name)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Create product failed: $($_.Exception.Message)" -ForegroundColor Red
    $productId = $null
}
Write-Host ""

# Test 5: Get Product by ID
if ($productId) {
    Write-Host "Test 5: Get Product by ID" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/products/$productId" -Method Get
        Write-Host "[PASS] Product retrieved: $($response.data.product.name)" -ForegroundColor Green
        Write-Host "Price: $($response.data.product.price), Stock: $($response.data.product.stock)" -ForegroundColor Gray
    } catch {
        Write-Host "[FAIL] Get product failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: Search Products
Write-Host "Test 6: Search Products" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/products/search?page=1&limit=5" -Method Get
    Write-Host "[PASS] Search returned $($response.data.Count) products" -ForegroundColor Green
    Write-Host "Total available: $($response.pagination.total)" -ForegroundColor Gray
    if ($response.data.Count -gt 0) {
        Write-Host "First product: $($response.data[0].name) - $($response.data[0].price)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Search products failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get Featured Products
Write-Host "Test 7: Get Featured Products" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/products/featured?limit=3" -Method Get
    Write-Host "[PASS] Retrieved $($response.data.Count) featured products" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Get featured products failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Update Product (Seller)
if ($productId) {
    Write-Host "Test 8: Update Product" -ForegroundColor Yellow
    $updateData = @{
        price = 79.99
        stock = 150
        description = "Updated test product description"
    } | ConvertTo-Json

    try {
        $headers = @{ Authorization = "Bearer $token" }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/products/$productId" -Method Put -Body $updateData -ContentType "application/json" -Headers $headers
        Write-Host "[PASS] Product updated successfully" -ForegroundColor Green
        Write-Host "New price: $($response.data.product.price)" -ForegroundColor Gray
    } catch {
        Write-Host "[FAIL] Update product failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 9: Search by Category
Write-Host "Test 9: Search Products by Category" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/categories/1/products?page=1&limit=5" -Method Get
    Write-Host "[PASS] Category search returned $($response.data.products.Count) products" -ForegroundColor Green
    Write-Host "Category: $($response.data.category.name)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Category search failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 10: Delete Product (Seller)
if ($productId) {
    Write-Host "Test 10: Delete Product" -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/products/$productId" -Method Delete -Headers $headers
        Write-Host "[PASS] Product deleted successfully" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] Delete product failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Catalog Service Tests Complete ===" -ForegroundColor Cyan
