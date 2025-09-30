#!/bin/bash

# Deploy Search Fixes with Cache Invalidation
# This script deploys the search fixes and invalidates CloudFront cache

set -e

echo "🚀 Deploying Search Encoding & CloudFront Fixes..."

# Check required environment variables
if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ CLOUDFRONT_DISTRIBUTION_ID environment variable is required"
    exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials are required"
    exit 1
fi

# Step 1: Build the application
echo "📦 Building application..."
npm run build

# Step 2: Deploy (assuming you have your deployment command)
echo "🚀 Deploying application..."
# Add your deployment command here, e.g.:
# npm run deploy
# or
# vercel --prod
# or
# aws s3 sync .next/static s3://your-bucket/

# Step 3: Invalidate CloudFront cache for search-related paths
echo "🔄 Invalidating CloudFront cache for search paths..."

aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths \
    "/content/search/*" \
    "/api/search*" \
    "/api/static-search*" \
    "/_next/static/chunks/app/api/search/*" \
    "/search*" \
  --query 'Invalidation.Id' \
  --output text

echo "✅ Cache invalidation created"

# Step 4: Wait a moment then test
echo "⏳ Waiting 30 seconds for initial propagation..."
sleep 30

# Step 5: Test search functionality
echo "🧪 Testing search functionality..."

# Test Chinese search
echo "Testing Chinese search (醫療)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/search_test.json \
  "https://www.it-square.hk/api/search?q=%E9%86%AB%E7%99%82&limit=3")

if [ "$RESPONSE" = "200" ]; then
    RESULTS=$(cat /tmp/search_test.json | jq -r '.results | length')
    echo "✅ Chinese search working: $RESULTS results found"
else
    echo "❌ Chinese search failed with status: $RESPONSE"
    cat /tmp/search_test.json
fi

# Test English search
echo "Testing English search (AI)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/search_test2.json \
  "https://www.it-square.hk/api/search?q=AI&limit=3")

if [ "$RESPONSE" = "200" ]; then
    RESULTS=$(cat /tmp/search_test2.json | jq -r '.results | length')
    echo "✅ English search working: $RESULTS results found"
else
    echo "❌ English search failed with status: $RESPONSE"
    cat /tmp/search_test2.json
fi

# Clean up
rm -f /tmp/search_test.json /tmp/search_test2.json

echo ""
echo "🎉 Search fixes deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 10-15 minutes for full CloudFront invalidation"
echo "2. Test search in incognito/private browsing mode"
echo "3. Monitor search performance in production"
echo ""
echo "🔍 Test URLs:"
echo "- Chinese: https://www.it-square.hk/?search=醫療"
echo "- English: https://www.it-square.hk/?search=AI"
echo "- Mixed: https://www.it-square.hk/?search=香港%20AI"