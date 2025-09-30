#!/bin/bash

# Deploy tested optimizations to main branch
set -e

echo "🚀 Deploying tested optimizations to main branch"

# Switch to main and merge optimizations
git checkout main
git merge amplify-test --no-edit

# Push to main
git push origin main

echo "✅ Deployed to main branch"
echo "📊 Monitor: https://main.d1gzwnduof06os.amplifyapp.com"
echo "⏳ Wait 3-5 minutes, then test production performance"