#!/bin/bash

# AWS Amplify DynamoDB Access Setup Script
# This script creates the necessary IAM role and policy for Amplify to access DynamoDB

set -e

echo "🚀 Setting up AWS Amplify DynamoDB access..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓${NC} AWS Account ID: $ACCOUNT_ID"

# Get Amplify App ID
APP_ID=$(aws amplify list-apps --query 'apps[?name==`react_it_square`].appId' --output text)
if [ -z "$APP_ID" ]; then
    echo -e "${RED}✗${NC} Amplify app 'react_it_square' not found"
    echo "Please create the Amplify app first or check the app name"
    exit 1
fi
echo -e "${GREEN}✓${NC} Amplify App ID: $APP_ID"

# Step 1: Create IAM Role
echo -e "\n${YELLOW}Step 1: Creating IAM Role...${NC}"

if aws iam get-role --role-name AmplifyDynamoDBAccessRole >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Role AmplifyDynamoDBAccessRole already exists"
else
    aws iam create-role \
        --role-name AmplifyDynamoDBAccessRole \
        --assume-role-policy-document file://aws/amplify-trust-policy.json \
        --description "Role for Amplify to access DynamoDB tables"
    echo -e "${GREEN}✓${NC} Created IAM role: AmplifyDynamoDBAccessRole"
fi

# Step 2: Create and Attach Policy
echo -e "\n${YELLOW}Step 2: Creating and attaching policy...${NC}"

POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/AmplifyDynamoDBAccessPolicy"

if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Policy AmplifyDynamoDBAccessPolicy already exists"
else
    aws iam create-policy \
        --policy-name AmplifyDynamoDBAccessPolicy \
        --policy-document file://aws/amplify-iam-policy.json \
        --description "Policy for Amplify to access DynamoDB and S3"
    echo -e "${GREEN}✓${NC} Created IAM policy: AmplifyDynamoDBAccessPolicy"
fi

# Attach policy to role
aws iam attach-role-policy \
    --role-name AmplifyDynamoDBAccessRole \
    --policy-arn "$POLICY_ARN"
echo -e "${GREEN}✓${NC} Attached policy to role"

# Step 3: Update Amplify App Service Role
echo -e "\n${YELLOW}Step 3: Updating Amplify app service role...${NC}"

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/AmplifyDynamoDBAccessRole"

aws amplify update-app \
    --app-id "$APP_ID" \
    --iam-service-role "$ROLE_ARN"
echo -e "${GREEN}✓${NC} Updated Amplify app service role"

# Step 4: Set Environment Variables
echo -e "\n${YELLOW}Step 4: Setting environment variables...${NC}"

aws amplify update-branch \
    --app-id "$APP_ID" \
    --branch-name amplify-test \
    --environment-variables \
    AWS_REGION=ap-east-1,NEXT_PUBLIC_AWS_REGION=ap-east-1,DYNAMODB_TABLE_NAME=MediaInvites,DYNAMODB_TOPICS_TABLE_NAME=it-square-topics,NEXT_PUBLIC_S3_BUCKET=itsquareupdatedcontent,NODE_ENV=production

echo -e "${GREEN}✓${NC} Set environment variables for amplify-test branch"

# Step 5: Verify DynamoDB Tables
echo -e "\n${YELLOW}Step 5: Verifying DynamoDB tables...${NC}"

if aws dynamodb describe-table --table-name MediaInvites --region ap-east-1 >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MediaInvites table exists"
else
    echo -e "${RED}✗${NC} MediaInvites table not found in ap-east-1"
fi

if aws dynamodb describe-table --table-name it-square-topics --region ap-east-1 >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} it-square-topics table exists"
else
    echo -e "${RED}✗${NC} it-square-topics table not found in ap-east-1"
fi

# Summary
echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Select your app: react-it-square"
echo "3. Go to amplify-test branch"
echo "4. Click 'Redeploy this version'"
echo "5. Monitor the build logs"
echo ""
echo -e "${YELLOW}Configuration Summary:${NC}"
echo "• IAM Role: AmplifyDynamoDBAccessRole"
echo "• Policy: AmplifyDynamoDBAccessPolicy"
echo "• App ID: $APP_ID"
echo "• Role ARN: $ROLE_ARN"
echo ""
echo -e "${YELLOW}Environment Variables Set:${NC}"
echo "• AWS_REGION=ap-east-1"
echo "• NEXT_PUBLIC_AWS_REGION=ap-east-1"
echo "• DYNAMODB_TABLE_NAME=MediaInvites"
echo "• DYNAMODB_TOPICS_TABLE_NAME=it-square-topics"
echo "• NEXT_PUBLIC_S3_BUCKET=itsquareupdatedcontent"
echo "• NODE_ENV=production"