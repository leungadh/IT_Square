#!/bin/bash

# Deploy optimized Lambda function to fix timeout issues
set -e

FUNCTION_NAME="it-square-s3-deployment-trigger"
REGION="ap-east-1"
LAMBDA_DIR="$(pwd)"

echo "🚀 Deploying optimized Lambda function to fix timeout issues..."

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: $TEMP_DIR"

# Copy optimized files
cp s3-deployment-trigger-optimized.js "$TEMP_DIR/index.js"
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

# Wait for code update to complete
echo "Waiting for code update to complete..."
while true; do
  STATUS=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.LastUpdateStatus' --output text)
  if [ "$STATUS" = "Successful" ]; then
    break
  fi
  echo "Status: $STATUS - waiting 10 seconds..."
  sleep 10
done

# Update configuration with increased timeout and memory
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs20.x \
  --timeout 300 \
  --memory-size 1024 \
  --region "$REGION"

# Clean up
cd "$LAMBDA_DIR"
rm -rf "$TEMP_DIR"

echo "✅ Optimized Lambda function deployed successfully!"
echo "🔧 Key improvements:"
echo "   - Timeout protection (4min execution + 1min buffer)"
echo "   - Prioritizes monthly indexes (critical for posts to show)"
echo "   - Optimized search indexing (recent posts first)"
echo "   - Better error handling and logging"
echo ""
echo "🔍 Monitor logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"