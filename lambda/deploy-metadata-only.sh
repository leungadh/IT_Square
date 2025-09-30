#!/bin/bash

# Deploy metadata-only Lambda function (removes Lunr search indexing)
set -e

FUNCTION_NAME="it-square-s3-deployment-trigger"
REGION="ap-east-1"
LAMBDA_DIR="$(pwd)"

echo "🚀 Deploying METADATA-ONLY Lambda function..."
echo "📝 This removes Lunr search indexing to fix timeout issues"

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: $TEMP_DIR"

# Copy metadata-only files
cp s3-deployment-trigger-metadata-only.js "$TEMP_DIR/index.js"
cp package-fixed.json "$TEMP_DIR/package.json"

cd "$TEMP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create deployment package
echo "📦 Creating deployment package..."
zip -r lambda-deployment.zip . -x "*.git*" "*.DS_Store*"

# Update Lambda function
echo "🔄 Updating Lambda function: $FUNCTION_NAME"
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://lambda-deployment.zip \
  --region "$REGION"

# Update configuration - can use smaller timeout now
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs18.x \
  --timeout 120 \
  --memory-size 512 \
  --region "$REGION"

# Clean up
cd "$LAMBDA_DIR"
rm -rf "$TEMP_DIR"

echo "✅ Metadata-only Lambda function deployed successfully!"
echo ""
echo "🔧 Changes made:"
echo "   ✅ ONLY processes monthly metadata indexes (fast)"
echo "   ❌ REMOVED Lunr search indexing (was causing timeouts)"
echo "   ⏱️  Reduced timeout to 2 minutes (was 5 minutes)"
echo "   💾 Reduced memory to 512MB (was 1024MB)"
echo ""
echo "📋 Next steps:"
echo "   1. Test by uploading a file to S3"
echo "   2. Posts should appear immediately after metadata indexing"
echo "   3. Search will work via existing it-square-weekly-lunr-indexer"
echo ""
echo "🔍 Monitor logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"