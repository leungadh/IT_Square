#!/bin/bash

# Deploy Custom Domain Fix
# This script deploys the fixes for custom domain article access issues

set -e

echo "🚀 Deploying Custom Domain Fix"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected. Committing fixes..."
    
    # Add all the fix files
    git add src/app/api/article/s3/route.ts
    git add src/app/article/\[...slug\]/page.tsx
    git add src/lib/domainUtils.ts
    git add .env.production
    git add amplify.yml
    git add CUSTOM_DOMAIN_FIX.md
    git add CUSTOM_DOMAIN_DEBUG.md
    
    # Commit with descriptive message
    git commit -m "Fix custom domain article access issues

- Update S3 API route with better URL decoding
- Improve article component fallback logic  
- Add domain utilities for better handling
- Update environment variables for custom domain
- Add comprehensive debugging and fix documentation

Fixes: https://it-square.hk/article/hashkey returning 'article not found'"
    
    echo "✅ Changes committed"
else
    echo "✅ No uncommitted changes"
fi

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

echo "⏳ Deployment initiated. Amplify will now build and deploy..."
echo ""
echo "🔍 Monitor deployment:"
echo "   AWS Console: https://console.aws.amazon.com/amplify/home?region=ap-east-1#/d1gzwnduof06os"
echo ""
echo "🧪 Test after deployment (wait ~5 minutes):"
echo "   curl -I 'https://it-square.hk/api/article/s3?key=content/posts/2025/08/hashkey.md'"
echo "   curl -I 'https://it-square.hk/article/hashkey'"
echo ""
echo "📊 Run comprehensive test:"
echo "   node scripts/test-custom-domain.js"
echo ""
echo "🎯 Expected results:"
echo "   ✅ Custom domain articles load correctly"
echo "   ✅ Popular posts section works"  
echo "   ✅ S3 API returns proper responses"
echo ""
echo "If issues persist, check CUSTOM_DOMAIN_FIX.md for additional steps."