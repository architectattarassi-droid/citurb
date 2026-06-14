# CITURBAREA Windows Setup Script
# Run with: .\scripts\setup.ps1

Write-Host "🚀 CITURBAREA Setup (Windows)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Node.js 18+ required. Current: $(node -v)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $(node -v) detected" -ForegroundColor Green
Write-Host ""

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}
Write-Host ""

# Setup environment file
if (-not (Test-Path "apps\api\.env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    Write-Host "⚠️  Please configure DATABASE_URL in apps\api\.env" -ForegroundColor Yellow
    Write-Host "   Example: postgresql://postgres:postgres@localhost:5432/citurbarea" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ℹ️  Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "   2. Create database 'citurbarea'" -ForegroundColor White
    Write-Host "   3. Update DATABASE_URL in apps\api\.env" -ForegroundColor White
    Write-Host "   4. Run: npm run setup:db" -ForegroundColor White
    exit 0
}

Write-Host "✅ .env file exists" -ForegroundColor Green
Write-Host ""

# Check database connection
Write-Host "🗄️  Checking database connection..." -ForegroundColor Yellow
Set-Location apps\api
$dbCheck = npx prisma db execute --schema ..\..\prisma\schema.prisma --stdin "SELECT 1;" 2>&1
Set-Location ..\..

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connection successful" -ForegroundColor Green
    Write-Host ""
    
    # Generate Prisma client
    Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
    npm run prisma:generate
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
    Write-Host ""
    
    # Run migrations
    Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
    npm run prisma:migrate
    Write-Host "✅ Migrations applied" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Cyan
    Write-Host "   Run: npm run dev:windows" -ForegroundColor White
    Write-Host "   API: http://localhost:4000" -ForegroundColor White
    Write-Host "   Web: http://localhost:5173" -ForegroundColor White
    
} else {
    Write-Host "❌ Database connection failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please complete these steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Install PostgreSQL 14+ with PostGIS:" -ForegroundColor White
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Create database:" -ForegroundColor White
    Write-Host "   Open pgAdmin or psql and run:" -ForegroundColor Cyan
    Write-Host "   CREATE DATABASE citurbarea;" -ForegroundColor Gray
    Write-Host "   CREATE EXTENSION postgis;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Configure DATABASE_URL in apps\api\.env" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Run this script again: .\scripts\setup.ps1" -ForegroundColor White
}
