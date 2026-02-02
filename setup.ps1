# ==================================================
# CloudRetail Application Setup Script
# ==================================================
# Run this script to initialize all databases and tables

Write-Host "==================================" -ForegroundColor Cyan
Write-Host " CloudRetail Database Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is running
Write-Host "Checking MySQL connection..." -ForegroundColor Yellow
$mysqlPath = "mysql"

try {
    $testConnection = & $mysqlPath --version 2>&1
    Write-Host "�� MySQL found: $testConnection" -ForegroundColor Green
}
catch {
    Write-Host "❌ MySQL not found. Please install MySQL or add it to PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Please enter your MySQL root password:" -ForegroundColor Yellow
$rootPassword = Read-Host -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword))

Write-Host ""
Write-Host "Creating databases..." -ForegroundColor Yellow

# Run init script
$initScript = Join-Path $PSScriptRoot "infrastructure\mysql\init.sql"
& $mysqlPath -u root -p$plainPassword < $initScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "�� Databases created successfully!" -ForegroundColor Green
}
else {
    Write-Host "❌ Failed to create databases" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating database schemas..." -ForegroundColor Yellow

# Run schema scripts
$schemas = @(
    "auth_schema.sql",
    "catalog_schema.sql",
    "order_schema.sql",
    "payment_schema.sql",
    "analytics_schema.sql"
)

foreach ($schema in $schemas) {
    Write-Host "  - Creating schema: $schema" -ForegroundColor Cyan
    $schemaPath = Join-Path $PSScriptRoot "infrastructure\mysql\$schema"
    & $mysqlPath -u root -p$plainPassword < $schemaPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ❌ Failed to create schema: $schema" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "�� All database schemas created successfully!" -ForegroundColor Green
Write-Host ""

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    # Update database password in .env
    $envContent = Get-Content ".env"
    $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=CloudRetail@2026"
    $envContent | Set-Content ".env"
    
    Write-Host "�� .env file created. Please update with your Stripe keys." -ForegroundColor Green
}
else {
    Write-Host "ℹ️  .env file already exists" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update .env file with your configuration"
Write-Host "  2. Run: npm run install-all"
Write-Host "  3. Start Redis: redis-server"
Write-Host "  4. Start services: npm run dev:auth (and others)"
Write-Host ""
Write-Host "Default users created:" -ForegroundColor Cyan
Write-Host "  Admin:  admin@cloudretail.com  / Admin@123"
Write-Host "  Seller: seller@cloudretail.com / Seller@123"
Write-Host "  Buyer:  buyer@cloudretail.com  / Buyer@123"
Write-Host ""
