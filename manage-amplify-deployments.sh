#!/bin/bash

# Amplify Deployment Management Script
# Helps manage multiple deployments and cancel unnecessary ones

echo "🚀 Amplify Deployment Management"
echo "================================"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI to manage deployments."
    exit 1
fi

# Set region
REGION="ap-east-1"
APP_NAME="react_it_square"

echo "📍 Region: $REGION"
echo "📱 App: $APP_NAME"
echo ""

# Function to get app ID
get_app_id() {
    aws amplify list-apps --region $REGION --query "apps[?name=='$APP_NAME'].appId" --output text 2>/dev/null
}

# Get app ID
APP_ID=$(get_app_id)

if [ -z "$APP_ID" ] || [ "$APP_ID" = "None" ]; then
    echo "❌ App '$APP_NAME' not found in region $REGION"
    echo "💡 Available apps:"
    aws amplify list-apps --region $REGION --query "apps[].{Name:name,AppId:appId}" --output table 2>/dev/null || echo "   No apps found or AWS CLI not configured"
    exit 1
fi

echo "✅ Found app: $APP_ID"
echo ""

# List current deployments
echo "📋 Current Deployments:"
echo "======================="

# Get deployments for the amplify-test branch
DEPLOYMENTS=$(aws amplify list-jobs --app-id $APP_ID --branch-name amplify-test --region $REGION --query "jobSummaries[?status=='RUNNING' || status=='PENDING'].{JobId:jobId,Status:status,StartTime:startTime}" --output table 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$DEPLOYMENTS"
    
    # Get running/pending job IDs
    RUNNING_JOBS=$(aws amplify list-jobs --app-id $APP_ID --branch-name amplify-test --region $REGION --query "jobSummaries[?status=='RUNNING'].jobId" --output text 2>/dev/null)
    PENDING_JOBS=$(aws amplify list-jobs --app-id $APP_ID --branch-name amplify-test --region $REGION --query "jobSummaries[?status=='PENDING'].jobId" --output text 2>/dev/null)
    
    echo ""
    echo "🔄 Running jobs: $RUNNING_JOBS"
    echo "⏳ Pending jobs: $PENDING_JOBS"
    echo ""
    
    # Offer to cancel pending jobs (keep the running one)
    if [ ! -z "$PENDING_JOBS" ]; then
        echo "💡 Recommendation: Cancel pending jobs to avoid redundant deployments"
        echo ""
        read -p "❓ Cancel all pending deployments? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for job_id in $PENDING_JOBS; do
                echo "🛑 Cancelling job: $job_id"
                aws amplify stop-job --app-id $APP_ID --branch-name amplify-test --job-id $job_id --region $REGION
                if [ $? -eq 0 ]; then
                    echo "✅ Successfully cancelled job: $job_id"
                else
                    echo "❌ Failed to cancel job: $job_id"
                fi
            done
        fi
    else
        echo "✅ No pending jobs to cancel"
    fi
    
else
    echo "❌ Failed to list deployments. Check your AWS credentials and permissions."
fi

echo ""
echo "🔗 Amplify Console: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"