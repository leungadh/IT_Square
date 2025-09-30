#!/bin/bash

# Deploy fixed Lambda function to AWS
# Run this script from the lambda directory

set -e

FUNCTION_NAME="it-square-s3-deployment-trigger"
REGION="ap-east-1"
LAMBDA_DIR="$(pwd)"

echo "🚀 Deploying fixed Lambda function..."

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: $TEMP_DIR"

# Copy fixed files
cp s3-indexing-trigger-fixed.js "$TEMP_DIR/index.js"
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

# Update runtime and timeout
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs18.x \
  --timeout 300 \
  --memory-size 1024 \
  --region "$REGION"

# Clean up
cd "$LAMBDA_DIR"
rm -rf "$TEMP_DIR"

echo "✅ Lambda function updated successfully!"
echo "🔍 Check CloudWatch logs for execution details"