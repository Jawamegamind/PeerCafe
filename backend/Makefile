.PHONY: help install format lint type-check test security clean all

help:  ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install:  ## Install dependencies
	conda env update -f requirements.yaml
	pip install -e .
	pre-commit install

format:  ## Format code with black and isort
	black .
	isort .

lint:  ## Run linting with flake8 and pylint
	flake8 .
	pylint **/*.py

type-check:  ## Run static type checking with mypy
	mypy .

security:  ## Run security checks with bandit
	bandit -r . -f json -o bandit-report.json || true
	@echo "Security report generated: bandit-report.json"

test:  ## Run tests with pytest
	pytest --cov=. --cov-report=html --cov-report=term

clean:  ## Clean up temporary files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -rf dist
	rm -rf build
	rm -f bandit-report.json

all: format lint type-check security test  ## Run all checks

pre-commit:  ## Run pre-commit on all files
	pre-commit run --all-files

dev-install:  ## Install in development mode
	pip install -e .