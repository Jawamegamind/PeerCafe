# PowerShell version of backend/format_code.sh
# Formats code using Black and organizes imports with isort.

Write-Host "Running Black (code formatter)..."
python -m black .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Black reported errors (exit code $LASTEXITCODE)" -ForegroundColor Red
} else {
    Write-Host "Black completed successfully" -ForegroundColor Green
}

Write-Host "Running isort (organize imports)..."
python -m isort .
if ($LASTEXITCODE -ne 0) {
    Write-Host "isort reported errors (exit code $LASTEXITCODE)" -ForegroundColor Red
} else {
    Write-Host "isort completed successfully" -ForegroundColor Green
}

Write-Host "Formatting complete."
