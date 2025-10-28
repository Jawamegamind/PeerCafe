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

function Run-Section {
    param(
        [string]$title,
        [scriptblock]$action
    )

    "`n===== $title =====`n" | Out-File -FilePath $reportFile -Encoding utf8 -Append
    try {
        # Capture output from the action and coerce into a single string to avoid PowerShell
        # trying to format/expand objects (which can cause errors like missing properties).
        $raw = & $action 2>&1
        if ($null -eq $raw) { $text = '' }
        elseif ($raw -is [System.Array]) { $text = ($raw -join "`n") }
        else { $text = $raw.ToString() }

        $text | Out-File -FilePath $reportFile -Encoding utf8 -Append

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
Run-Section -title 'BACKEND: pytest (with coverage if available)' -action {
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
Run-Section -title 'FRONTEND: Jest (with coverage)' -action {
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
        $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $frontendPath -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr -NoNewWindow -Wait -PassThru

        # Read the captured output and emit it so Run-Section will append it to the report
        Get-Content -Path $tmpOut -Encoding utf8
        if (Test-Path $tmpErr) {
            "`n--- STDERR (frontend) ---`n" | Write-Output
            Get-Content -Path $tmpErr -Encoding utf8
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
Run-Section -title 'BACKEND: code-quality (black/isort/flake8/bandit)' -action {
    Push-Location -Path (Join-Path $scriptDir '..\backend')
    try {
        if (Test-Path '.\check_code.ps1') {
            # Run the backend style/lint script and capture its output
            & powershell -NoProfile -ExecutionPolicy Bypass -File ".\check_code.ps1" 2>&1
        } else {
            Write-Output "No backend/check_code.ps1 found"
        }
    } finally {
        Pop-Location
    }
}

"`nAll sections completed at: $(Get-Date -Format 'u')`n" | Out-File -FilePath $reportFile -Encoding utf8 -Append

Write-Host "Test run complete. Report written to: $reportFile"
