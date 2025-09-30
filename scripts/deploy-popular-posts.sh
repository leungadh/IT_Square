#!/bin/bash

# Deploy Popular Posts Infrastructure
# This script sets up the necessary AWS resources for the popular posts feature

set -e

echo "🚀 Deploying Popular Posts Infrastructure..."

# Configuration
REGION="us-east-1"
LAMBDA_FUNCTION_NAME="activity-score-resolver"
APPSYNC_API_NAME="ITSquareAPI"

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

# Create DynamoDB Tables
echo "📊 Creating DynamoDB tables..."

# Create UserBehavior table
if aws dynamodb describe-table --table-name UserBehavior --region $REGION > /dev/null 2>&1; then
    print_warning "UserBehavior table already exists"
else
    aws dynamodb create-table \
        --table-name UserBehavior \
        --attribute-definitions \
            AttributeName=sessionId,AttributeType=S \
            AttributeName=timestamp,AttributeType=S \
            AttributeName=contentId,AttributeType=S \
            AttributeName=contentType,AttributeType=S \
            AttributeName=userId,AttributeType=S \
        --key-schema \
            AttributeName=sessionId,KeyType=HASH \
            AttributeName=timestamp,KeyType=RANGE \
        --global-secondary-indexes \
            'IndexName=ContentActivityIndex,KeySchema=[{AttributeName=contentId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=10,WriteCapacityUnits=10}' \
            'IndexName=UserActivityIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
            'IndexName=ContentTypeActivityIndex,KeySchema=[{AttributeName=contentType,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=10,WriteCapacityUnits=10}' \
        --provisioned-throughput ReadCapacityUnits=20,WriteCapacityUnits=20 \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --region $REGION
    
    # Enable TTL
    aws dynamodb update-time-to-live \
        --table-name UserBehavior \
        --time-to-live-specification Enabled=true,AttributeName=ttl \
        --region $REGION
    
    print_status "UserBehavior table created with TTL enabled"
fi

# Wait for tables to be active
echo "⏳ Waiting for tables to be active..."
aws dynamodb wait table-exists --table-name UserBehavior --region $REGION
print_status "All tables are active"

// Remove Lambda role creation
// Remove Lambda packaging and deployment
// Remove EventBridge rule creation

echo ""
echo "🎉 Popular Posts Infrastructure Deployment Complete!"
echo ""
echo "📋 Summary:"
echo "  • DynamoDB Table: UserBehavior"
echo ""
echo "🔧 Next Steps:"
echo "  1. Update your GraphQL API to include the new resolvers"
echo "  2. Deploy your frontend changes"
echo "  3. Test the popular posts functionality"
echo ""
echo "📊 Monitor your deployment:"
echo "  • DynamoDB Console: https://console.aws.amazon.com/dynamodb/"