#!/bin/bash

# CloudFront Distribution Setup for it-square.hk
set -e

DOMAIN="it-square.hk"
WWW_DOMAIN="www.it-square.hk"
ORIGIN_DOMAIN="main.d1gzwnduof06os.amplifyapp.com"
REGION="ap-east-1"

echo "🚀 Setting up CloudFront distribution for $DOMAIN"

# Step 1: Create SSL Certificate (if not exists)
echo "📜 Checking SSL certificate..."
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
  --output text)

if [ -z "$CERT_ARN" ]; then
  echo "📜 Creating SSL certificate for $DOMAIN..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN" \
    --subject-alternative-names "$WWW_DOMAIN" \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)
  
  echo "📜 Certificate ARN: $CERT_ARN"
  echo "⚠️  Please validate the certificate in ACM console before proceeding"
  echo "⚠️  Add the DNS validation records to your domain"
  read -p "Press Enter after certificate validation is complete..."
else
  echo "✅ Certificate already exists: $CERT_ARN"
fi

# Step 2: Create Cache Policies
echo "🗂️ Creating cache policies..."

# Static Assets Policy
STATIC_POLICY_ID=$(aws cloudfront create-cache-policy \
  --cache-policy-config '{
    "Name": "it-square-static-assets",
    "Comment": "Cache policy for static assets with long TTL",
    "DefaultTTL": 31536000,
    "MaxTTL": 31536000,
    "MinTTL": 31536000,
    "ParametersInCacheKeyAndForwardedToOrigin": {
      "EnableAcceptEncodingGzip": true,
      "EnableAcceptEncodingBrotli": true,
      "QueryStringsConfig": {
        "QueryStringBehavior": "none"
      },
      "HeadersConfig": {
        "HeaderBehavior": "none"
      },
      "CookiesConfig": {
        "CookieBehavior": "none"
      }
    }
  }' \
  --query 'CachePolicy.Id' \
  --output text 2>/dev/null || echo "Policy may already exist")

# Dynamic Content Policy
DYNAMIC_POLICY_ID=$(aws cloudfront create-cache-policy \
  --cache-policy-config '{
    "Name": "it-square-dynamic-content",
    "Comment": "Cache policy for dynamic content with ISR",
    "DefaultTTL": 180,
    "MaxTTL": 300,
    "MinTTL": 0,
    "ParametersInCacheKeyAndForwardedToOrigin": {
      "EnableAcceptEncodingGzip": true,
      "EnableAcceptEncodingBrotli": true,
      "QueryStringsConfig": {
        "QueryStringBehavior": "whitelist",
        "QueryStrings": {
          "Quantity": 3,
          "Items": ["page", "category", "search"]
        }
      },
      "HeadersConfig": {
        "HeaderBehavior": "whitelist",
        "Headers": {
          "Quantity": 4,
          "Items": [
            "Accept",
            "Accept-Language", 
            "CloudFront-Viewer-Country",
            "User-Agent"
          ]
        }
      },
      "CookiesConfig": {
        "CookieBehavior": "none"
      }
    }
  }' \
  --query 'CachePolicy.Id' \
  --output text 2>/dev/null || echo "Policy may already exist")

echo "✅ Cache policies created"

# Step 3: Create Origin Request Policy
ORIGIN_POLICY_ID=$(aws cloudfront create-origin-request-policy \
  --origin-request-policy-config '{
    "Name": "it-square-origin-policy",
    "Comment": "Origin request policy for it-square.hk",
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": {
        "Quantity": 3,
        "Items": [
          "Accept",
          "Accept-Language",
          "User-Agent"
        ]
      }
    },
    "CookiesConfig": {
      "CookieBehavior": "none"
    },
    "QueryStringsConfig": {
      "QueryStringBehavior": "all"
    }
  }' \
  --query 'OriginRequestPolicy.Id' \
  --output text 2>/dev/null || echo "Policy may already exist")

echo "✅ Origin request policy created"

# Step 4: Create CloudFront Distribution
echo "☁️ Creating CloudFront distribution..."

DISTRIBUTION_CONFIG='{
  "CallerReference": "'$(date +%s)'",
  "Aliases": {
    "Quantity": 2,
    "Items": ["'$DOMAIN'", "'$WWW_DOMAIN'"]
  },
  "DefaultRootObject": "",
  "Comment": "IT Square HK - Optimized distribution",
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
    "CachePolicyId": "'$DYNAMIC_POLICY_ID'",
    "OriginRequestPolicyId": "'$ORIGIN_POLICY_ID'",
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "CacheBehaviors": {
    "Quantity": 3,
    "Items": [
      {
        "PathPattern": "/_next/static/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "'$STATIC_POLICY_ID'",
        "Compress": true,
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        }
      },
      {
        "PathPattern": "/images/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "'$STATIC_POLICY_ID'",
        "Compress": true,
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        }
      },
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "amplify-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "'$DYNAMIC_POLICY_ID'",
        "OriginRequestPolicyId": "'$ORIGIN_POLICY_ID'",
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

# Step 5: Create DNS records (instructions)
echo ""
echo "🌐 DNS Configuration Required:"
echo "   Add these CNAME records to your DNS:"
echo "   $DOMAIN -> $DISTRIBUTION_DOMAIN"
echo "   $WWW_DOMAIN -> $DISTRIBUTION_DOMAIN"
echo ""
echo "⏳ Distribution is deploying... This may take 15-20 minutes"
echo "   Monitor status: aws cloudfront get-distribution --id $DISTRIBUTION_ID"

# Save configuration
cat > cloudfront-config.json << EOF
{
  "distributionId": "$DISTRIBUTION_ID",
  "distributionDomain": "$DISTRIBUTION_DOMAIN",
  "customDomains": ["$DOMAIN", "$WWW_DOMAIN"],
  "certificateArn": "$CERT_ARN",
  "staticPolicyId": "$STATIC_POLICY_ID",
  "dynamicPolicyId": "$DYNAMIC_POLICY_ID",
  "originPolicyId": "$ORIGIN_POLICY_ID"
}
EOF

echo "✅ Configuration saved to cloudfront-config.json"
echo "🚀 CloudFront setup complete!"