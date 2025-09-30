#!/usr/bin/env node

/**
 * CloudFront Cache Invalidation Script
 * 
 * This script invalidates specific paths in CloudFront to ensure
 * users get the latest version of the website after deployment.
 */

const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

// CloudFront Distribution ID - you'll need to replace this with your actual distribution ID
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E1234567890ABC';

// Paths to invalidate
const PATHS_TO_INVALIDATE = [
  '/about',
  '/en/about',
  '/zh/about', 
  '/popular',
  '/api/popular-posts*',
  '/api/topics',
  '/_next/static/chunks/app/about/*',
  '/_next/static/chunks/app/popular/*',
  '/_next/static/chunks/app/en/about/*',
  '/_next/static/chunks/app/zh/about/*'
];

async function invalidateCache() {
  try {
    console.log('🔄 Starting CloudFront cache invalidation...');
    
    const client = new CloudFrontClient({ 
      region: 'us-east-1' // CloudFront is always in us-east-1
    });
    
    const command = new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        Paths: {
          Quantity: PATHS_TO_INVALIDATE.length,
          Items: PATHS_TO_INVALIDATE
        },
        CallerReference: `cache-invalidation-${Date.now()}`
      }
    });
    
    const response = await client.send(command);
    
    console.log('✅ Cache invalidation created successfully!');
    console.log(`📋 Invalidation ID: ${response.Invalidation.Id}`);
    console.log(`🕒 Status: ${response.Invalidation.Status}`);
    console.log('📝 Invalidated paths:');
    PATHS_TO_INVALIDATE.forEach(path => console.log(`   - ${path}`));
    console.log('\n⏳ Cache invalidation typically takes 10-15 minutes to complete.');
    
  } catch (error) {
    console.error('❌ Error invalidating cache:', error.message);
    
    if (error.name === 'AccessDenied') {
      console.log('\n💡 Make sure your AWS credentials have CloudFront permissions:');
      console.log('   - cloudfront:CreateInvalidation');
      console.log('   - cloudfront:GetInvalidation');
    }
    
    if (error.message.includes('distribution')) {
      console.log('\n💡 Make sure to set the correct CLOUDFRONT_DISTRIBUTION_ID:');
      console.log('   export CLOUDFRONT_DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID');
    }
    
    process.exit(1);
  }
}

// Run the invalidation
invalidateCache();