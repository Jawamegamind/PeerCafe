# PowerShell version of backend/check_code.sh
# Runs formatter, import sorter, linting, security scan, and tests.

Write-Host "Running Black (code formatter)..."
python -m black .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Black reported errors (exit code $LASTEXITCODE)" -ForegroundColor Red
} else {
    Write-Host "Black completed successfully" -ForegroundColor Green
}

Write-Host "Running isort (import sorter)..."
python -m isort .
if ($LASTEXITCODE -ne 0) {
    Write-Host "isort reported errors (exit code $LASTEXITCODE)" -ForegroundColor Red
} else {
    Write-Host "isort completed successfully" -ForegroundColor Green
}

Write-Host "Running Flake8 (style checker)..."
python -m flake8 .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Flake8 found style issues (see output above)" -ForegroundColor Yellow
} else {
    Write-Host "Flake8 passed" -ForegroundColor Green
}

Write-Host "Running Bandit (security checker)..."
python -m bandit -r . -f json -o bandit-report.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "Bandit reported issues. Check 'bandit-report.json' for details." -ForegroundColor Yellow
} else {
    Write-Host "Bandit completed (report: bandit-report.json)" -ForegroundColor Green
}

Write-Host "Running pytest (tests with coverage)..."
pytest --cov=. --cov-report=term
if ($LASTEXITCODE -ne 0) {
    Write-Host "Some tests failed. See pytest output above." -ForegroundColor Red
} else {
    Write-Host "All tests passed" -ForegroundColor Green
}

Write-Host "Code quality check complete!"
Write-Host "If Bandit ran, view 'bandit-report.json' for the security analysis." -ForegroundColor Cyan
