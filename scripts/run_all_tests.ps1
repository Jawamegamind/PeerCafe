<#
.SYNOPSIS
  Run backend (pytest) and frontend (Jest) test suites and produce a single report file.

.DESCRIPTION
  This script runs the backend Python tests (pytest) with coverage if available,
  and the frontend JavaScript tests (Jest) with coverage. Results and coverage
  output are written to a single report file (test_results.txt) located next to
  this script. The report file is overwritten on each run.

  The script attempts to detect the available frontend package manager (pnpm/yarn/npm)
  and falls back to npm when unknown.

  Usage: Run in PowerShell (Windows):
    .\scripts\run_all_tests.ps1

#>

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportFile = Join-Path $scriptDir 'test_results.txt'

function Write-ReportLine {
    param([string]$text)
    $text | Out-File -FilePath $reportFile -Encoding utf8 -Append
}

# Initialize/overwrite report file
"Test run at: $(Get-Date -Format 'u')" | Out-File -FilePath $reportFile -Encoding utf8
"Repository: $(Get-Location)" | Out-File -FilePath $reportFile -Encoding utf8 -Append

function Invoke-Section {
    param(
        [string]$title,
        [scriptblock]$action
    )
    "`n===== $title =====`n" | Out-File -FilePath $reportFile -Encoding utf8 -Append
    try {

    # Execute the action and capture all output (stdout + stderr) as a single string.
    # Out-String preserves unicode characters and prevents PowerShell from emitting
    # escaped sequences into the file when the captured output is an array/object.
    $text = & $action 2>&1 | Out-String -Width 4096

    if ($null -eq $text) { $text = '' }

    # Filter out noisy warning/deprecation lines so the report focuses on results.
    # We apply a case-insensitive regex matching common warning markers.
    $lines = $text -split "`n"
    $filtered = $lines | Where-Object { $_ -notmatch '(?i)\bwarning\b|deprecated|pydanticdeprecated|we detected multiple lockfiles|nativecommanderror' }
    $filteredText = $filtered -join "`n"

    # Ensure we write using UTF8 to preserve characters across platforms.
    $filteredText | Out-File -FilePath $reportFile -Encoding utf8 -Append

        # Capture the exit code of the last external command if set
        $exit = $LASTEXITCODE
        if ($null -ne $exit -and $exit -ne 0) {
            "`n*** EXIT CODE: $exit`n" | Out-File -FilePath $reportFile -Encoding utf8 -Append
        }
    } catch {
        "Exception while running section: $_" | Out-File -FilePath $reportFile -Encoding utf8 -Append
    }
}

# --------------------
# Backend: pytest
# --------------------
Invoke-Section -title 'BACKEND: pytest (with coverage if available)' -action {
    Push-Location -Path (Join-Path $scriptDir '..\backend')
    try {
        # Prefer pytest CLI if available, else python -m pytest
        if (Get-Command pytest -ErrorAction SilentlyContinue) {
            & pytest --maxfail=1 -q --disable-warnings --cov=. --cov-report=term
        } else {
            & python -m pytest -q --maxfail=1 --disable-warnings
        }

        # If pytest produced a .coverage file, attempt to show coverage report as well
        if (Test-Path '.coverage') {
            Write-Output "`n--- coverage report (backend) ---`n"
            if (Get-Command coverage -ErrorAction SilentlyContinue) {
                & coverage report -m 2>&1
            } else {
                # Try python -m coverage
                & python -m coverage report -m 2>&1
            }
        }
    } finally {
        Pop-Location
    }
}

# --------------------
# Frontend: Jest
# --------------------
Invoke-Section -title 'FRONTEND: Jest (with coverage)' -action {
    # Use Start-Process with redirected output to avoid PowerShell formatting issues
    $frontendPath = Join-Path $scriptDir '..\frontend'
    $tmpOut = [System.IO.Path]::GetTempFileName()
    $tmpErr = [System.IO.Path]::GetTempFileName()
    try {
        Push-Location -Path $frontendPath
        # Detect package manager
        $cmd = 'npm run test:coverage --silent'
        if (Test-Path 'pnpm-lock.yaml') { $cmd = 'pnpm run test:coverage --silent' }
        elseif (Test-Path 'yarn.lock') { $cmd = 'yarn run test:coverage --silent' }

        # Run via cmd.exe to capture raw stdout/stderr to a file
        Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $frontendPath -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr -NoNewWindow -Wait

        # Read the captured output, filter noisy Next.js warnings, and emit it so Invoke-Section will append it to the report
    $outLines = Get-Content -Path $tmpOut -Encoding utf8
    # Remove specific Next.js workspace-root inference warnings which are noisy in CI-local runs
    $filteredOut = $outLines | Where-Object { $_ -notmatch 'Next\.js inferred your workspace root|Detected additional lockfiles|We detected multiple lockfiles' }
        $filteredOut
        if (Test-Path $tmpErr) {
            "`n--- STDERR (frontend) ---`n" | Write-Output
            $errLines = Get-Content -Path $tmpErr -Encoding utf8
            $filteredErr = $errLines | Where-Object { $_ -notmatch 'Next\.js inferred your workspace root|Detected additional lockfiles' }
            $filteredErr
        }

        if (Test-Path 'coverage') {
            Write-Output "`n--- coverage directory: frontend/coverage (detailed files inside) ---`n"
        }
    } finally {
        Pop-Location
        Remove-Item -Path $tmpOut,$tmpErr -ErrorAction SilentlyContinue
    }
}

# --------------------
# Backend: code quality (black/isort/flake8/bandit)
# --------------------
Invoke-Section -title 'BACKEND: code-quality (black/isort/flake8/bandit)' -action {
    Push-Location -Path (Join-Path $scriptDir '..\backend')
    try {
        if (Test-Path '.\check_code.ps1') {
            # Run the backend style/lint script directly in this session to avoid
            # nested PowerShell invocation which produced an error record for
            # emoji/unicode output from child processes. Capture output as string.
            & .\check_code.ps1 2>&1 | Out-String -Width 4096
        } else {
            Write-Output "No backend/check_code.ps1 found"
        }
    } finally {
        Pop-Location
    }
}

"`nAll sections completed at: $(Get-Date -Format 'u')`n" | Out-File -FilePath $reportFile -Encoding utf8 -Append

Write-Host "Test run complete. Report written to: $reportFile"
