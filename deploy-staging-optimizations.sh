#!/bin/bash

# Deploy performance optimizations to amplify-test first
set -e

echo "🧪 Deploying performance optimizations to amplify-test staging"

# 1. Backup current config
cp next.config.ts next.config.backup.ts
echo "✅ Backed up current config"

# 2. Apply optimized config
cp next.config.optimized.ts next.config.ts
echo "✅ Applied optimized Next.js config"

# 3. Deploy to staging branch
git add .
git commit -m "feat: performance optimizations for staging test

- Add proper caching headers for static assets
- Optimize image loading with WebP/AVIF
- Implement ISR with 3-minute revalidation
- Add stable image URLs to prevent cache misses"

git push origin amplify-test

echo "🚀 Pushed to amplify-test branch"
echo "📊 Monitor deployment: https://amplify-test.d1gzwnduof06os.amplifyapp.com"
echo "⏳ Wait 3-5 minutes for deployment, then run performance test"