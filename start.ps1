# CITURBAREA V166 - Script de demarrage Windows
# ================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CITURBAREA V166 - Initialisation Windows" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Fix npm registry
Write-Host "[1/4] Configuration du registre npm..." -ForegroundColor Yellow
npm config set registry https://registry.npmjs.org/
npm config delete proxy 2>$null
npm config delete https-proxy 2>$null
Write-Host "  OK: registry = https://registry.npmjs.org/" -ForegroundColor Green

# STEP 2: Clean cache
Write-Host "[2/4] Nettoyage cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>$null
if (Test-Path "node_modules") {
    Write-Host "  Suppression node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}
Write-Host "  OK" -ForegroundColor Green

# STEP 3: npm install
Write-Host "[3/4] Installation des dependances (~2-4 min)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERREUR npm install." -ForegroundColor Red
    Write-Host "  Reessayez: npm install --prefer-offline" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# STEP 4: Start frontend
Write-Host "[4/4] Demarrage du frontend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  P1 Tunnel: http://localhost:5173/p1" -ForegroundColor Green
Write-Host "  Backend: NON REQUIS (pricing local)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

npm run dev:web
