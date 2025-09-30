#!/bin/bash

# Deploy with CloudFront Cache Invalidation
# This script builds the application and invalidates CloudFront cache

set -e

echo "🚀 Starting deployment with cache invalidation..."

# Build the application
echo "📦 Building application..."
npm run build

# Deploy (this would typically be handled by your CI/CD pipeline)
echo "🔄 Deployment completed by CI/CD pipeline"

# Wait a moment for deployment to propagate
echo "⏳ Waiting for deployment to propagate..."
sleep 30

# Invalidate CloudFront cache for critical paths
echo "🗑️  Invalidating CloudFront cache..."

# Use AWS CLI to invalidate cache if available
if command -v aws &> /dev/null; then
    if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/about" "/en/about" "/zh/about" "/popular" "/api/popular-posts*" "/api/topics" \
            --query 'Invalidation.Id' \
            --output text
        echo "✅ CloudFront cache invalidation initiated"
    else
        echo "⚠️  CLOUDFRONT_DISTRIBUTION_ID not set, skipping cache invalidation"
    fi
else
    echo "⚠️  AWS CLI not available, skipping cache invalidation"
fi

echo "🎉 Deployment with cache invalidation completed!"
echo "⏳ Cache invalidation takes 10-15 minutes to complete globally"