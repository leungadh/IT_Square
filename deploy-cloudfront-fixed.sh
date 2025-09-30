#!/bin/bash

# CloudFront Distribution Setup for it-square.hk (Fixed)
set -e

DOMAIN="it-square.hk"
WWW_DOMAIN="www.it-square.hk"
ORIGIN_DOMAIN="main.d1gzwnduof06os.amplifyapp.com"
CERT_ARN="arn:aws:acm:us-east-1:891377044387:certificate/44764365-f5dd-4607-84ae-da273dc6ddec"

echo "🚀 Setting up CloudFront distribution for $DOMAIN"

# Use AWS Managed Cache Policies (no creation needed)
MANAGED_CACHING_OPTIMIZED="658327ea-f89d-4fab-a63d-7e88639e58f6"  # Managed-CachingOptimized
MANAGED_CACHING_DISABLED="4135ea2d-6df8-44a3-9df3-4b5a84be39ad"   # Managed-CachingDisabled

echo "☁️ Creating CloudFront distribution..."

DISTRIBUTION_CONFIG='{
  "CallerReference": "'$(date +%s)'",
  "Aliases": {
    "Quantity": 2,
    "Items": ["'$DOMAIN'", "'$WWW_DOMAIN'"]
  },
  "DefaultRootObject": "",
  "Comment": "IT Square HK - Production distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "amplify-origin",
        "DomainName": "'$ORIGIN_DOMAIN'",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "amplify-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "'$MANAGED_CACHING_OPTIMIZED'",
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "'$MANAGED_CACHING_DISABLED'",
        "Compress": true,
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        }
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "'$CERT_ARN'",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_All",
  "HttpVersion": "http2and3"
}'

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config "$DISTRIBUTION_CONFIG" \
  --query 'Distribution.Id' \
  --output text)

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"

# Get distribution domain name
DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)

echo "📋 Distribution Details:"
echo "   Distribution ID: $DISTRIBUTION_ID"
echo "   Domain Name: $DISTRIBUTION_DOMAIN"
echo "   Custom Domains: $DOMAIN, $WWW_DOMAIN"

# Save configuration
cat > cloudfront-config.json << EOF
{
  "distributionId": "$DISTRIBUTION_ID",
  "distributionDomain": "$DISTRIBUTION_DOMAIN",
  "customDomains": ["$DOMAIN", "$WWW_DOMAIN"],
  "certificateArn": "$CERT_ARN"
}
EOF

echo "✅ Configuration saved to cloudfront-config.json"
echo "⏳ Distribution is deploying... This may take 15-20 minutes"
echo "🚀 CloudFront setup complete!"