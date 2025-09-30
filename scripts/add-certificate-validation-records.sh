#!/bin/bash

# Add SSL certificate validation records to Route53
set -e

DOMAIN="it-square.hk"
ZONE_ID="Z03813283K68Y4GSG6AAT"
CERT_ARN="arn:aws:acm:us-east-1:891377044387:certificate/44764365-f5dd-4607-84ae-da273dc6ddec"

echo "🔐 Adding SSL certificate validation records to Route53"

# Add validation record for it-square.hk
echo "📋 Adding validation record for $DOMAIN..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_75c90d61761a8794ee52d6c3fa2af267.it-square.hk",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_f3e766730898ac1e893b18afca6fe55f.xlfgrmvvlj.acm-validations.aws"}]
      }
    }]
  }'

# Add validation record for www.it-square.hk  
echo "📋 Adding validation record for www.$DOMAIN..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT", 
      "ResourceRecordSet": {
        "Name": "_aa3f0405d40e067d6d1eae6e33117857.www.it-square.hk",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_5a6927ca259b57c43df1fcd6828f1c8c.xlfgrmvvlj.acm-validations.aws"}]
      }
    }]
  }'

echo "✅ Certificate validation records added to Route53"
echo "⏳ Waiting for certificate validation..."

# Monitor certificate status
while true; do
    STATUS=$(aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 --query 'Certificate.Status' --output text)
    
    echo "📋 Certificate Status: $STATUS"
    
    if [ "$STATUS" = "ISSUED" ]; then
        echo "✅ Certificate validated successfully!"
        echo "🚀 Ready to deploy CloudFront"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ Certificate validation failed"
        exit 1
    else
        echo "⏳ Waiting for validation... (checking again in 30 seconds)"
        sleep 30
    fi
done