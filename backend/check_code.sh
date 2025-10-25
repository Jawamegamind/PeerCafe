#!/bin/bash
# Backend Code Quality Check Script

echo "🎨 Running Black (Code Formatter)..."
black .

echo "📋 Running isort (Import Sorter)..."
isort .

echo "🔍 Running Flake8 (Style Checker)..."
flake8 . || echo "❌ Flake8 found style issues (see above)"

echo "🔒 Running Bandit (Security Checker)..."
bandit -r . -f json -o bandit-report.json || echo "⚠️  Security issues found (check bandit-report.json)"

echo "🧪 Running pytest (Tests)..."
pytest --cov=. --cov-report=term || echo "❌ Some tests failed"

echo "✅ Code quality check complete!"
echo "📊 Check bandit-report.json for security analysis"