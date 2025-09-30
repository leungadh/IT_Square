#!/bin/bash

# Find CloudFront Distribution for www.it-square.hk

echo "🔍 Finding CloudFront distribution for www.it-square.hk..."

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "💡 Or use the AWS Console method in URGENT_CLOUDFRONT_FIX.md"
    exit 1
fi

# Find distribution by domain name
echo "📡 Searching for distribution..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query 'DistributionList.Items[?Aliases.Items[0]==`www.it-square.hk`].Id' \
    --output text 2>/dev/null)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    echo "❌ Distribution not found for www.it-square.hk"
    echo "🔍 Searching for distributions with it-square in the name..."
    
    # Try to find any distribution with it-square
    aws cloudfront list-distributions \
        --query 'DistributionList.Items[?contains(Aliases.Items[0], `it-square`)].{Id:Id, Domain:Aliases.Items[0], Status:Status}' \
        --output table 2>/dev/null
    
    echo ""
    echo "💡 If you see distributions above, use one of those IDs"
    echo "💡 Or check AWS Console: https://console.aws.amazon.com/cloudfront/"
else
    echo "✅ Found distribution: $DISTRIBUTION_ID"
    echo ""
    echo "🗑️  To invalidate cache, run:"
    echo "aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*'"
    echo ""
    echo "📋 Or set environment variable:"
    echo "export CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID"
fi