#!/bin/bash

# Deploy Search Optimization - Phase 1
# This script sets up CloudFront distribution and optimizes search files

set -e

echo "🚀 Deploying Search Optimization - Phase 1..."

# Configuration
REGION="ap-east-1"
BUCKET="itsquareupdatedcontent"
DISTRIBUTION_CONFIG="aws/cloudfront-search-distribution.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS CLI is configured"

# Step 1: Rebuild search index with compression
echo "📦 Rebuilding search index with compression..."
if [ -f "scripts/build-static-search-index.js" ]; then
    node scripts/build-static-search-index.js
    print_status "Search index rebuilt with compression"
else
    print_warning "Search index build script not found, skipping..."
fi

# Step 2: Create CloudFront distribution
echo "☁️ Creating CloudFront distribution..."

# Check if distribution already exists
EXISTING_DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='CloudFront distribution for search index files optimization'].Id" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DIST" ]; then
    print_warning "CloudFront distribution already exists: $EXISTING_DIST"
    DISTRIBUTION_ID="$EXISTING_DIST"
else
    # Create new distribution
    DISTRIBUTION_RESULT=$(aws cloudfront create-distribution \
        --distribution-config file://$DISTRIBUTION_CONFIG \
        --output json)
    
    DISTRIBUTION_ID=$(echo $DISTRIBUTION_RESULT | jq -r '.Distribution.Id')
    DISTRIBUTION_DOMAIN=$(echo $DISTRIBUTION_RESULT | jq -r '.Distribution.DomainName')
    
    print_status "CloudFront distribution created: $DISTRIBUTION_ID"
    print_status "Distribution domain: $DISTRIBUTION_DOMAIN"
    
    echo "⏳ Waiting for distribution to deploy (this may take 10-15 minutes)..."
    aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
    print_status "Distribution deployed successfully"
fi

# Step 3: Update S3 objects with proper headers
echo "📄 Updating S3 objects with optimization headers..."

# Update search index files with proper headers
aws s3api copy-object \
    --bucket $BUCKET \
    --copy-source "$BUCKET/content/search/search-index.json" \
    --key "content/search/search-index.json" \
    --content-type "application/json; charset=utf-8" \
    --content-encoding "gzip" \
    --cache-control "public, max-age=3600, s-maxage=7200" \
    --metadata-directive REPLACE

aws s3api copy-object \
    --bucket $BUCKET \
    --copy-source "$BUCKET/content/search/search-docs.json" \
    --key "content/search/search-docs.json" \
    --content-type "application/json; charset=utf-8" \
    --content-encoding "gzip" \
    --cache-control "public, max-age=3600, s-maxage=7200" \
    --metadata-directive REPLACE

print_status "S3 objects updated with optimization headers"

# Step 4: Get distribution info
DISTRIBUTION_INFO=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --output json)
DISTRIBUTION_DOMAIN=$(echo $DISTRIBUTION_INFO | jq -r '.Distribution.DomainName')
DISTRIBUTION_STATUS=$(echo $DISTRIBUTION_INFO | jq -r '.Distribution.Status')

echo ""
echo "🎉 Search Optimization Phase 1 Complete!"
echo ""
echo "📋 Summary:"
echo "  • CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "  • Distribution Domain: $DISTRIBUTION_DOMAIN"
echo "  • Status: $DISTRIBUTION_STATUS"
echo "  • Search index files optimized with Gzip compression"
echo "  • Cache headers configured for optimal performance"
echo ""
echo "🔧 Next Steps:"
echo "  1. Add NEXT_PUBLIC_CLOUDFRONT_DOMAIN=$DISTRIBUTION_DOMAIN to your .env file"
echo "  2. Test search performance with the new optimizations"
echo "  3. Monitor CloudWatch metrics for performance improvements"
echo ""
echo "📊 Expected Improvements:"
echo "  • 60-80% reduction in search index file sizes"
echo "  • Faster loading from global CDN edge locations"
echo "  • Better caching and reduced S3 costs"
echo ""
echo "🔗 CloudFront Console: https://console.aws.amazon.com/cloudfront/home?region=us-east-1#/distributions/$DISTRIBUTION_ID"