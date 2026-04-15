#!/usr/bin/env powershell
# Setup script for FarmerPay Backend
# Run: .\setup.ps1

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  FarmerPay Backend Setup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if in backend directory
if (-not (Test-Path "requirements.txt")) {
    Write-Host "ERROR: requirements.txt not found!" -ForegroundColor Red
    Write-Host "Please run this script from the backend directory:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor Yellow
    exit 1
}

# Check Python version
Write-Host "`n1️⃣  Checking Python..." -ForegroundColor Green
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Install Python 3.9+ from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ $pythonVersion" -ForegroundColor Green

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "`n2️⃣  Creating virtual environment..." -ForegroundColor Green
    python -m venv venv
    Write-Host "   ✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "`n2️⃣  Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "`n3️⃣  Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1
Write-Host "   ✅ Virtual environment activated" -ForegroundColor Green

# Upgrade pip
Write-Host "`n4️⃣  Upgrading pip..." -ForegroundColor Green
python -m pip install --upgrade pip -q
Write-Host "   ✅ pip upgraded" -ForegroundColor Green

# Install requirements
Write-Host "`n5️⃣  Installing dependencies..." -ForegroundColor Green
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Verify installation
Write-Host "`n6️⃣  Verifying installation..." -ForegroundColor Green
python -c "import motor; import fastapi; import pymongo; print('   ✅ All packages installed')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Some packages failed to import!" -ForegroundColor Red
    exit 1
}

Write-Host "`n===============================================" -ForegroundColor Green
Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "`nNext steps:`n" -ForegroundColor Cyan
Write-Host "1. Start the backend:" -ForegroundColor Yellow
Write-Host "   python main.py`n" -ForegroundColor White
Write-Host "2. In another terminal, run the test:" -ForegroundColor Yellow
Write-Host "   python verify_integration.py" -ForegroundColor White
Write-Host "`n" -ForegroundColor Cyan
