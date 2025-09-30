#!/bin/bash

# Script to set up Amplify permissions for DynamoDB access
# Run this script to create the necessary IAM role and policy

set -e

ROLE_NAME="AmplifyDynamoDBAccessRole"
POLICY_NAME="AmplifyDynamoDBAccessPolicy"
AMPLIFY_APP_ID="d1gzwnduof06os"  # Your Amplify app ID
AWS_REGION="ap-east-1"

echo "🚀 Setting up Amplify permissions for DynamoDB access..."

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# Create trust policy for Amplify
cat > /tmp/amplify-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
echo "🔐 Creating IAM role: $ROLE_NAME"
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file:///tmp/amplify-trust-policy.json \
  --description "Role for Amplify to access DynamoDB tables" \
  --region $AWS_REGION || echo "Role might already exist"

# Create and attach the policy
echo "📝 Creating and attaching policy: $POLICY_NAME"
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name $POLICY_NAME \
  --policy-document file://aws/amplify-dynamodb-policy.json \
  --region $AWS_REGION

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "✅ Role ARN: $ROLE_ARN"

echo ""
echo "🎯 Next Steps:"
echo "1. Go to Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Select your app: $AMPLIFY_APP_ID"
echo "3. Go to App settings → General → Service role"
echo "4. Select the role: $ROLE_NAME"
echo "5. Save and redeploy your app"
echo ""
echo "📋 Environment Variables to add in Amplify Console:"
echo "APPSYNC_URL=https://l3l5x22umzg4zmhpikypjx2mce.appsync-api.ap-east-1.amazonaws.com/graphql"
echo "APPSYNC_KEY=da2-gbimuwow5jbffe4azr45txexou"
echo "AWS_REGION=ap-east-1"
echo "NEXT_PUBLIC_S3_BUCKET=itsquareupdatedcontent"

# Clean up
rm -f /tmp/amplify-trust-policy.json

echo "✅ Setup complete!"