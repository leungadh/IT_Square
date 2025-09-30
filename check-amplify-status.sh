#!/bin/bash

# AWS Amplify Deployment Status Checker
# Usage: ./check-amplify-status.sh

echo "🔍 Checking AWS Amplify Apps in ap-east-1..."
echo "================================================"

# List all Amplify apps
APPS=$(aws amplify list-apps --region ap-east-1 --query "apps[?name=='making-hk-it'].{AppId:appId,Name:name,Status:productionBranch.status,URL:defaultDomain}" --output table)

if [ -z "$APPS" ] || [ "$APPS" = "None" ]; then
    echo "❌ No 'making-hk-it' app found yet."
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=ap-east-1#/create"
    echo "2. Create app with repository: swjong/react_it_square"
    echo "3. Use branch: main"
    echo "4. Run this script again to monitor deployment"
else
    echo "✅ Found making-hk-it app:"
    echo "$APPS"
    
    # Get app ID
    APP_ID=$(aws amplify list-apps --region ap-east-1 --query "apps[?name=='making-hk-it'].appId" --output text)
    
    if [ ! -z "$APP_ID" ]; then
        echo ""
        echo "📊 Recent Deployments:"
        echo "====================="
        aws amplify list-jobs --app-id "$APP_ID" --branch-name main --region ap-east-1 --max-results 5 --query "jobSummaries[].{JobId:jobId,Status:status,StartTime:startTime,Type:jobType}" --output table
        
        echo ""
        echo "🌐 App URL: https://main.d$APP_ID.amplifyapp.com"
        echo "📱 Console: https://console.aws.amazon.com/amplify/home?region=ap-east-1#/$APP_ID/main"
    fi
fi

echo ""
echo "🔄 To check status again, run: ./check-amplify-status.sh"
