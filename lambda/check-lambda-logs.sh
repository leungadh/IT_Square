#!/bin/bash

FUNCTION_NAME="it-square-s3-deployment-trigger"
REGION="ap-east-1"

echo "🔍 Checking Lambda function logs..."

# Get recent log events
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$FUNCTION_NAME" --region $REGION

echo "📋 Recent executions:"
aws logs tail "/aws/lambda/$FUNCTION_NAME" --since 1h --region $REGION

echo "🔍 Checking for errors:"
aws logs filter-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region $REGION

echo "✅ Checking for successful completions:"
aws logs filter-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-pattern "rebuilt successfully" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region $REGION