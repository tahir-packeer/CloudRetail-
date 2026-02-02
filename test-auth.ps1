# Test Auth Service Endpoints
$baseUrl = "http://localhost:3001/api/auth"

Write-Host "Testing CloudRetail Auth Service" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login with demo buyer
Write-Host "Test 1: Login as Buyer" -ForegroundColor Yellow
$loginBody = @{
    email    = "buyer@cloudretail.com"
    password = "Buyer@123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.data.user.firstName) $($response.data.user.lastName)" -ForegroundColor Green
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor Green
    Write-Host "Access Token: $($response.data.accessToken.Substring(0, 50))..." -ForegroundColor Gray
    $buyerToken = $response.data.accessToken
}
catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Login as Seller
Write-Host "Test 2: Login as Seller" -ForegroundColor Yellow
$sellerLogin = @{
    email    = "seller@cloudretail.com"
    password = "Seller@123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $sellerLogin -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.data.user.firstName) $($response.data.user.lastName)" -ForegroundColor Green
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor Green
    Write-Host "Business: $($response.data.user.sellerProfile.businessName)" -ForegroundColor Green
    $sellerToken = $response.data.accessToken
}
catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Login as Admin
Write-Host "Test 3: Login as Admin" -ForegroundColor Yellow
$adminLogin = @{
    email    = "admin@cloudretail.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $adminLogin -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.data.user.firstName) $($response.data.user.lastName)" -ForegroundColor Green
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor Green
    $adminToken = $response.data.accessToken
}
catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 4: Get Profile (Protected Route)
if ($buyerToken) {
    Write-Host "Test 4: Get User Profile (Protected)" -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $buyerToken"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/profile" -Method Get -Headers $headers
        Write-Host "✅ Profile retrieved!" -ForegroundColor Green
        Write-Host "Email: $($response.data.user.email)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 5: Register New User
Write-Host "Test 5: Register New User" -ForegroundColor Yellow
$registerBody = @{
    email     = "testuser@example.com"
    password  = "Test@1234"
    firstName = "Test"
    lastName  = "User"
    role      = "buyer"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "User ID: $($response.data.user.id)" -ForegroundColor Green
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "User already exists (expected if run multiple times)" -ForegroundColor Cyan
    }
    else {
        Write-Host "Registration failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Auth Service Tests Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
