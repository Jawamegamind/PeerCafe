#!/bin/bash
# Quick Format Script - Run this before committing

echo "🎨 Formatting code with Black..."
black .

echo "📋 Organizing imports with isort..."  
isort .

echo "✅ Code formatted! Ready for commit."