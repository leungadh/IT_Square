#!/bin/bash

# DNS Migration Helper for it-square.hk
set -e

DOMAIN="it-square.hk"
REGION="ap-east-1"

echo "🌐 DNS Migration Helper for $DOMAIN"

# Function to create Route 53 hosted zone
create_hosted_zone() {
    echo "📋 Creating Route 53 hosted zone..."
    
    ZONE_ID=$(aws route53 create-hosted-zone \
        --name "$DOMAIN" \
        --caller-reference "$(date +%s)" \
        --hosted-zone-config Comment="IT Square HK production domain" \
        --query 'HostedZone.Id' \
        --output text | sed 's|/hostedzone/||')
    
    echo "✅ Hosted zone created: $ZONE_ID"
    
    # Get nameservers
    echo "📝 Route 53 Nameservers (update these at GoDaddy):"
    aws route53 get-hosted-zone --id "/hostedzone/$ZONE_ID" \
        --query 'DelegationSet.NameServers' \
        --output table
    
    echo "$ZONE_ID" > route53-zone-id.txt
    echo "💾 Zone ID saved to route53-zone-id.txt"
}

# Function to create DNS records
create_dns_records() {
    if [ ! -f "cloudfront-config.json" ]; then
        echo "❌ CloudFront config not found. Run ./deploy-cloudfront.sh first"
        exit 1
    fi
    
    if [ ! -f "route53-zone-id.txt" ]; then
        echo "❌ Route 53 zone ID not found. Run create_hosted_zone first"
        exit 1
    fi
    
    ZONE_ID=$(cat route53-zone-id.txt)
    CLOUDFRONT_DOMAIN=$(jq -r '.distributionDomain' cloudfront-config.json)
    
    echo "🔗 Creating DNS records for CloudFront..."
    
    # Main domain A record (alias to CloudFront)
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$ZONE_ID" \
        --change-batch "{
            \"Changes\": [{
                \"Action\": \"CREATE\",
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
    
    # WWW subdomain CNAME
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$ZONE_ID" \
        --change-batch "{
            \"Changes\": [{
                \"Action\": \"CREATE\",
                \"ResourceRecordSet\": {
                    \"Name\": \"www.$DOMAIN\",
                    \"Type\": \"CNAME\",
                    \"TTL\": 300,
                    \"ResourceRecords\": [{\"Value\": \"$DOMAIN\"}]
                }
            }]
        }"
    
    echo "✅ DNS records created"
    echo "📋 Next: Update nameservers at GoDaddy"
}

# Function to configure Amplify custom domain
configure_amplify_domain() {
    echo "🔧 Configuring Amplify custom domain..."
    
    aws amplify create-domain-association \
        --app-id d1gzwnduof06os \
        --domain-name "$DOMAIN" \
        --sub-domain-settings "[
            {\"prefix\": \"\", \"branchName\": \"main\"},
            {\"prefix\": \"www\", \"branchName\": \"main\"}
        ]"
    
    echo "✅ Amplify domain configured"
}

# Function to check DNS propagation
check_dns_propagation() {
    echo "🔍 Checking DNS propagation..."
    
    for server in 8.8.8.8 1.1.1.1 208.67.222.222; do
        echo "Checking $server:"
        dig @$server "$DOMAIN" +short || echo "Not propagated yet"
    done
}

# Function to test site after migration
test_site() {
    echo "🧪 Testing site functionality..."
    
    # Test HTTP response
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Site responding correctly"
        
        # Run performance test
        if [ -f "performance-check.js" ]; then
            node performance-check.js "https://$DOMAIN"
        fi
    else
        echo "❌ Site not responding (HTTP $HTTP_CODE)"
    fi
}

# Main menu
case "${1:-menu}" in
    "zone")
        create_hosted_zone
        ;;
    "dns")
        create_dns_records
        ;;
    "amplify")
        configure_amplify_domain
        ;;
    "check")
        check_dns_propagation
        ;;
    "test")
        test_site
        ;;
    "menu"|*)
        echo "🛠️  DNS Migration Helper Commands:"
        echo "   ./dns-migration-helper.sh zone     - Create Route 53 hosted zone"
        echo "   ./dns-migration-helper.sh dns      - Create DNS records"
        echo "   ./dns-migration-helper.sh amplify  - Configure Amplify domain"
        echo "   ./dns-migration-helper.sh check    - Check DNS propagation"
        echo "   ./dns-migration-helper.sh test     - Test site functionality"
        echo ""
        echo "📋 Migration Steps:"
        echo "   1. Run CloudFront setup: ./deploy-cloudfront.sh"
        echo "   2. Create hosted zone: ./dns-migration-helper.sh zone"
        echo "   3. Create DNS records: ./dns-migration-helper.sh dns"
        echo "   4. Update nameservers at GoDaddy (manual)"
        echo "   5. Configure Amplify: ./dns-migration-helper.sh amplify"
        echo "   6. Monitor: ./dns-migration-helper.sh check"
        ;;
esac