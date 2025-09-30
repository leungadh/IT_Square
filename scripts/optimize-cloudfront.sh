#!/bin/bash

# Optimize CloudFront for better performance
set -e

DISTRIBUTION_ID="E1UJEQZPEUQ621"

echo "🚀 Optimizing CloudFront for performance..."

# Get current distribution config
aws cloudfront get-distribution-config --id $DISTRIBUTION_ID > current-config.json

# Extract ETag and config
ETAG=$(jq -r '.ETag' current-config.json)
CONFIG=$(jq '.DistributionConfig' current-config.json)

# Add image caching behavior
UPDATED_CONFIG=$(echo $CONFIG | jq '
.CacheBehaviors.Items += [{
  "PathPattern": "/images/*",
  "TargetOriginId": "amplify-origin", 
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
  "Compress": true,
  "TrustedSigners": {
    "Enabled": false,
    "Quantity": 0
  }
}] |
.CacheBehaviors.Items += [{
  "PathPattern": "*.png",
  "TargetOriginId": "amplify-origin",
  "ViewerProtocolPolicy": "redirect-to-https", 
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
  "Compress": true,
  "TrustedSigners": {
    "Enabled": false,
    "Quantity": 0
  }
}] |
.CacheBehaviors.Items += [{
  "PathPattern": "*.jpg",
  "TargetOriginId": "amplify-origin",
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6", 
  "Compress": true,
  "TrustedSigners": {
    "Enabled": false,
    "Quantity": 0
  }
}] |
.CacheBehaviors.Quantity = (.CacheBehaviors.Items | length)
')

# Update distribution
echo "📝 Updating CloudFront distribution..."
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config "$UPDATED_CONFIG" \
  --if-match $ETAG > /dev/null

echo "✅ CloudFront optimized for images and performance"
echo "⏳ Changes will take 5-10 minutes to deploy globally"

# Clean up
rm current-config.json

echo "🎯 Optimizations applied:"
echo "   - Added /images/* caching"
echo "   - Added *.png, *.jpg caching"  
echo "   - Enabled compression for all images"