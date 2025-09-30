#!/bin/bash

echo "🔐 Checking SSL Certificate Status..."

CERT_ARN="arn:aws:acm:us-east-1:891377044387:certificate/44764365-f5dd-4607-84ae-da273dc6ddec"

while true; do
    STATUS=$(aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 --query 'Certificate.Status' --output text)
    
    echo "📋 Current Status: $STATUS"
    
    if [ "$STATUS" = "ISSUED" ]; then
        echo "✅ Certificate validated successfully!"
        echo "🚀 Ready to deploy CloudFront"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ Certificate validation failed"
        break
    else
        echo "⏳ Waiting for validation... (checking again in 30 seconds)"
        sleep 30
    fi
done