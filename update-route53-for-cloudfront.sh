#!/bin/bash

# Update Route 53 DNS to point to CloudFront
set -e

DOMAIN="it-square.hk"

echo "🔗 Updating Route 53 DNS for CloudFront"

# Check if CloudFront config exists
if [ ! -f "cloudfront-config.json" ]; then
    echo "❌ CloudFront config not found. Run ./deploy-cloudfront.sh first"
    exit 1
fi

# Get CloudFront domain from config
CLOUDFRONT_DOMAIN=$(jq -r '.distributionDomain' cloudfront-config.json)
ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query 'HostedZones[0].Id' --output text | sed 's|/hostedzone/||')

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Zone ID: $ZONE_ID"
echo "   CloudFront: $CLOUDFRONT_DOMAIN"

# Update A record to point to CloudFront
echo "🔄 Updating A record..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"$DOMAIN\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"DNSName\": \"$CLOUDFRONT_DOMAIN\",
          \"EvaluateTargetHealth\": false,
          \"HostedZoneId\": \"Z2FDTNDATAQYW2\"
        }
      }
    }]
  }"

# Update WWW CNAME
echo "🔄 Updating WWW CNAME..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"www.$DOMAIN\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"$DOMAIN\"}]
      }
    }]
  }"

echo "✅ Route 53 DNS updated"
echo "📋 Next steps:"
echo "   1. Update nameservers at HK registry"
echo "   2. Configure Amplify custom domain"
echo "   3. Wait for DNS propagation (2-6 hours)"