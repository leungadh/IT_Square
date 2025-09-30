#!/bin/bash

# Deploy weekly Lunr indexer Lambda to AWS
# Run this script from the lambda directory

set -e

FUNCTION_NAME="it-square-weekly-lunr-indexer"
REGION="ap-east-1"
ROLE_ARN="arn:aws:iam::891377044387:role/lambda-execution-role"
LAMBDA_DIR="$(pwd)"

echo "🚀 Deploying weekly Lunr indexer Lambda..."

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: $TEMP_DIR"

# Copy files
cp s3-weekly-lunr-indexer.js "$TEMP_DIR/index.js"
cp package-fixed.json "$TEMP_DIR/package.json"  # Assuming same dependencies

cd "$TEMP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create deployment package
echo "📦 Creating deployment package..."
zip -r lambda-deployment.zip . -x "*.git*" "*.DS_Store*"

cd "$LAMBDA_DIR"

# Check if function exists
EXISTS=0
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
  echo "🔄 Function exists, will update"
  EXISTS=1
else
  echo "🆕 Creating new Lambda function..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs18.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --timeout 900 \
    --memory-size 2048 \
    --region "$REGION" \
    --zip-file fileb://$TEMP_DIR/lambda-deployment.zip

  echo "Waiting for function to become active..."
  for i in {1..30}; do
    STATE=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.State' --output text 2>/dev/null || echo "Pending")
    if [ "$STATE" = "Active" ]; then
      echo "Function is active."
      break
    fi
    echo "Function state: $STATE, waiting 10s..."
    sleep 10
  done
  if [ "$STATE" != "Active" ]; then
    echo "Function did not become active in time."
    exit 1
  fi
fi

# Update Lambda function code if it existed before this run
if [ $EXISTS -eq 1 ] && [ -f $TEMP_DIR/lambda-deployment.zip ]; then
  echo "🔄 Updating Lambda function code: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://$TEMP_DIR/lambda-deployment.zip \
    --region "$REGION"

  echo "Waiting for update to complete..."
  for i in {1..30}; do
    LAST_UPDATE_STATUS=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.LastUpdateStatus' --output text 2>/dev/null || echo "InProgress")
    if [ "$LAST_UPDATE_STATUS" = "Successful" ]; then
      echo "Update successful."
      break
    fi
    echo "Update status: $LAST_UPDATE_STATUS, waiting 10s..."
    sleep 10
  done
  if [ "$LAST_UPDATE_STATUS" != "Successful" ]; then
    echo "Function update did not complete successfully."
    exit 1
  fi
fi

# Update configuration
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs18.x \
  --timeout 900 \
  --memory-size 2048 \
  --region "$REGION"

echo "Waiting for configuration update to complete..."
for i in {1..30}; do
  LAST_UPDATE_STATUS=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.LastUpdateStatus' --output text 2>/dev/null || echo "InProgress")
  if [ "$LAST_UPDATE_STATUS" = "Successful" ]; then
    echo "Configuration update successful."
    break
  fi
  echo "Config update status: $LAST_UPDATE_STATUS, waiting 10s..."
  sleep 10
done
if [ "$LAST_UPDATE_STATUS" != "Successful" ]; then
  echo "Configuration update did not complete successfully."
  exit 1
fi

# Set up schedule
RULE_NAME="weekly-lunr-rebuild"
if aws events describe-rule --name "$RULE_NAME" --region "$REGION" > /dev/null 2>&1; then
  echo "🔄 Updating existing schedule rule"
else
  echo "🆕 Creating new schedule rule"
  aws events put-rule \
    --name "$RULE_NAME" \
    --schedule-expression "cron(0 1 ? * SUN *)" \
    --state ENABLED \
    --region "$REGION"
fi

# Add permission for EventBridge to invoke Lambda
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "AllowEventBridgeInvoke" \
  --action "lambda:InvokeFunction" \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/$RULE_NAME" \
  --region "$REGION"  || true  # Ignore if already exists

# Add target
aws events put-targets \
  --rule "$RULE_NAME" \
  --targets "Id"=1,"Arn"="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME" \
  --region "$REGION"

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Weekly Lunr indexer Lambda deployed and scheduled successfully!"
echo "🔍 Function Name: $FUNCTION_NAME"
echo "🕒 Schedule: Every Sunday at 1 AM UTC"