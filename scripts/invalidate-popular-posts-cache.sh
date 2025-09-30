#!/bin/bash

# Invalidate CloudFront cache for popular posts functionality

set -e

echo "🔄 Invalidating CloudFront cache for popular posts..."

# Check if we have the distribution ID
if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ CLOUDFRONT_DISTRIBUTION_ID environment variable is required"
    echo "💡 You can find your distribution ID in the AWS CloudFront console"
    exit 1
fi

# Invalidate popular posts related paths
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths \
    "/popular*" \
    "/api/popular-posts*" \
    "/_next/static/chunks/app/popular/*" \
    "/_next/static/chunks/components/PopularPosts*" \
    "/popular-fresh*" \
  --query 'Invalidation.Id' \
  --output text

echo "✅ Popular posts cache invalidation created"
echo "⏳ Invalidation typically takes 10-15 minutes to complete"

# Test the popular posts after a short delay
echo "⏳ Waiting 30 seconds for initial propagation..."
sleep 30

echo "🧪 Testing popular posts API..."
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/popular_test.json \
  -H "Cache-Control: no-cache" \
  "https://www.it-square.hk/api/popular-posts?limit=3")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Popular posts API working"
    
    # Check first post URL
    FIRST_POST=$(cat /tmp/popular_test.json | jq -r '.[0] | "/article/\(.year)/\(.month)/\(.slug | gsub("\\s+"; "-") | gsub("\\n"; ""))"')
    echo "🔗 Testing first post URL: $FIRST_POST"
    
    ARTICLE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
      -H "Cache-Control: no-cache" \
      "https://www.it-square.hk$FIRST_POST")
    
    if [ "$ARTICLE_RESPONSE" = "200" ]; then
        echo "✅ First article URL working"
    else
        echo "❌ First article URL failed with status: $ARTICLE_RESPONSE"
    fi
else
    echo "❌ Popular posts API failed with status: $RESPONSE"
    cat /tmp/popular_test.json
fi

# Clean up
rm -f /tmp/popular_test.json

echo ""
echo "🎉 Popular posts cache invalidation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 10-15 minutes for full CloudFront invalidation"
echo "2. Test popular posts page in incognito/private browsing mode"
echo "3. Click on popular posts to verify article links work"
echo ""
echo "🔍 Test URLs:"
echo "- Popular posts: https://www.it-square.hk/popular"
echo "- Popular fresh: https://www.it-square.hk/popular-fresh"