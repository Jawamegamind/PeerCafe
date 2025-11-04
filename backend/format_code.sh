#!/bin/bash
# Quick Format Script - Run this before committing
set -euo pipefail

# Use the workspace venv if available; fall back to current python
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$ROOT_DIR/.." && pwd)"
VENV_PY="$WORKSPACE_DIR/.venv/bin/python"

run_mod() {
	local mod="$1"; shift
	if command -v "$mod" >/dev/null 2>&1; then
		# If the module is an executable on PATH (e.g., black/isort), use it directly
		"$mod" "$@"
	elif [[ -x "$VENV_PY" ]]; then
		"$VENV_PY" -m "$mod" "$@"
	else
		python -m "$mod" "$@"
	fi
}

echo "🎨 Formatting code with Black..."
run_mod black .

echo "📋 Organizing imports with isort..."
run_mod isort .

echo "✅ Code formatted! Ready for commit."