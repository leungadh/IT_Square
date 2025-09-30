#!/bin/bash

# Quick fix for Next.js images
DISTRIBUTION_ID="E1UJEQZPEUQ621"

echo "🖼️ Fixing Next.js image optimization..."

# Get current config
aws cloudfront get-distribution-config --id $DISTRIBUTION_ID > temp-config.json
ETAG=$(jq -r '.ETag' temp-config.json)

# Create minimal update to add _next/* behavior
cat > update-config.json << 'EOF'
{
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "Compress": true,
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        }
      },
      {
        "PathPattern": "/_next/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true,
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        }
      }
    ]
  }
}
EOF

# Merge with existing config
UPDATED_CONFIG=$(jq -s '.[0].DistributionConfig * .[1]' temp-config.json update-config.json)

# Update distribution
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config "$UPDATED_CONFIG" \
  --if-match $ETAG

echo "✅ Added /_next/* cache behavior for Next.js images"
echo "⏳ Deploying... Images will work in 5-10 minutes"

# Cleanup
rm temp-config.json update-config.json