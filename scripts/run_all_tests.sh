#!/usr/bin/env bash

#
# Run backend (pytest) and frontend (Jest) test suites and produce a single report file.
# This is a bash port of scripts/run_all_tests.ps1 for Linux/macOS.
#
# Output: scripts/test_results.txt (overwritten on each run)
# Usage: ./scripts/run_all_tests.sh
#

set -u
IFS=$'\n\t'

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
report_file="${script_dir}/test_results.txt"

write_report() {
  # Append stdin to report file
  cat >>"${report_file}"
}

init_report() {
  : >"${report_file}"
  {
    printf "Test run at: %s\n" "$(date -u '+%Y-%m-%d %H:%M:%SZ')"
    printf "Repository: %s\n" "$(pwd)"
  } | write_report
}

filter_common_noise() {
  # Filters noisy lines to keep the report focused on results.
  # Uses case-insensitive grep; if nothing remains, produce empty output without failing.
  grep -Eiv 'warning|deprecated|pydanticdeprecated|we detected multiple lockfiles|nativecommanderror' || true
}

run_section() {
  local title="$1"; shift
  printf "\n===== %s =====\n\n" "$title" | write_report

  # Capture stdout+stderr combined from the provided command/function
  local output
  if output="$($@ 2>&1)"; then
    local status=0
    :
  else
    local status=$?
  fi

  # Filter and append
  if [ -n "${output}" ]; then
    printf "%s\n" "${output}" | filter_common_noise | write_report
  fi

  if [ ${status} -ne 0 ]; then
    printf "\n*** EXIT CODE: %d\n\n" "${status}" | write_report
  fi
}

backend_pytest() {
  pushd "${script_dir}/../backend" >/dev/null || return 1
  # Prefer pytest CLI if available, else python -m pytest
  if command -v pytest >/dev/null 2>&1; then
    pytest --maxfail=1 -q --disable-warnings --cov=. --cov-report=term
  else
    python -m pytest -q --maxfail=1 --disable-warnings
  fi

  # If .coverage exists, try to show coverage report as well
  if [ -f .coverage ]; then
    echo
    echo "--- coverage report (backend) ---"
    if command -v coverage >/dev/null 2>&1; then
      coverage report -m
    else
      python -m coverage report -m
    fi
  fi
  popd >/dev/null || true
}

frontend_jest() {
  local frontend_path="${script_dir}/../frontend"
  pushd "${frontend_path}" >/dev/null || return 1

  # Detect package manager
  local cmd="npm run test:coverage --silent"
  if [ -f pnpm-lock.yaml ]; then
    cmd="pnpm run test:coverage --silent"
  elif [ -f yarn.lock ]; then
    cmd="yarn run test:coverage --silent"
  fi

  # Capture stdout and stderr separately to allow distinct labeling
  local tmp_out tmp_err
  tmp_out="$(mktemp)"
  tmp_err="$(mktemp)"

  # Run the command; do not use 'set -e' so failures are recorded but don't abort the script
  bash -lc "${cmd}" >"${tmp_out}" 2>"${tmp_err}"
  local status=$?

  # Filter noisy Next.js/workspace lockfile warnings from stdout
  if [ -s "${tmp_out}" ]; then
    grep -Eiv 'Next\.js inferred your workspace root|Detected additional lockfiles|We detected multiple lockfiles' "${tmp_out}" || true
  fi

  # If there is stderr, emit it with a clear header
  if [ -s "${tmp_err}" ]; then
    echo
    echo "--- STDERR (frontend) ---"
    grep -Eiv 'Next\.js inferred your workspace root|Detected additional lockfiles' "${tmp_err}" || true
  fi

  # Note coverage directory presence
  if [ -d coverage ]; then
    echo
    echo "--- coverage directory: frontend/coverage (detailed files inside) ---"
  fi

  rm -f "${tmp_out}" "${tmp_err}" 2>/dev/null || true
  popd >/dev/null || true
  return ${status}
}

backend_code_quality() {
  pushd "${script_dir}/../backend" >/dev/null || return 1
  if [ -x ./check_code.sh ]; then
    ./check_code.sh
  elif [ -f ./check_code.sh ]; then
    bash ./check_code.sh
  else
    echo "No backend/check_code.sh found"
  fi
  popd >/dev/null || true
}

main() {
  init_report
  run_section "BACKEND: pytest (with coverage if available)" backend_pytest
  run_section "FRONTEND: Jest (with coverage)" frontend_jest
  run_section "BACKEND: code-quality (black/isort/flake8/bandit)" backend_code_quality
  printf "\nAll sections completed at: %s\n\n" "$(date -u '+%Y-%m-%d %H:%M:%SZ')" | write_report
  echo "Test run complete. Report written to: ${report_file}"
}

main "$@"
