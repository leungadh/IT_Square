#!/bin/bash

echo "Monitoring Amplify deployment..."
echo "Checking every 30 seconds..."

while true; do
    echo "$(date): Checking deployment status..."
    
    # Test if contact page loads without JS errors
    response=$(curl -s -w "%{http_code}" https://it-square.hk/contact -o /tmp/contact_test.html)
    
    if [ "$response" = "200" ]; then
        # Check if JS chunks are loading
        chunk_count=$(grep -o '_next/static/chunks/[^"]*' /tmp/contact_test.html | wc -l)
        
        if [ "$chunk_count" -gt 0 ]; then
            first_chunk=$(grep -o '_next/static/chunks/[^"]*' /tmp/contact_test.html | head -1)
            chunk_status=$(curl -s -w "%{http_code}" -o /dev/null "https://it-square.hk/$first_chunk")
            
            if [ "$chunk_status" = "200" ]; then
                echo "✅ Deployment successful! JS chunks are loading correctly."
                echo "Contact page should now work without redirect issues."
                break
            else
                echo "❌ JS chunks still not loading (status: $chunk_status)"
            fi
        else
            echo "❌ No JS chunks found in HTML"
        fi
    else
        echo "❌ Contact page not accessible (status: $response)"
    fi
    
    echo "Waiting 30 seconds..."
    sleep 30
done

echo "Deployment monitoring complete."