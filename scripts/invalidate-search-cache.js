#!/usr/bin/env node

const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

if (!DISTRIBUTION_ID) {
  console.error('❌ CLOUDFRONT_DISTRIBUTION_ID environment variable is required');
  process.exit(1);
}

const client = new CloudFrontClient({
  region: 'us-east-1', // CloudFront is always us-east-1
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function invalidateSearchCache() {
  const paths = [
    '/content/search/*',
    '/api/search*',
    '/api/static-search*',
    '/_next/static/chunks/app/api/search/*',
    '/search*'
  ];

  try {
    console.log('🔄 Creating CloudFront invalidation for search paths...');
    console.log('Paths to invalidate:', paths);

    const command = new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths
        },
        CallerReference: `search-cache-invalidation-${Date.now()}`
      }
    });

    const result = await client.send(command);
    
    console.log('✅ Invalidation created successfully!');
    console.log('Invalidation ID:', result.Invalidation?.Id);
    console.log('Status:', result.Invalidation?.Status);
    console.log('⏳ Invalidation typically takes 10-15 minutes to complete');
    
  } catch (error) {
    console.error('❌ Failed to create invalidation:', error);
    process.exit(1);
  }
}

invalidateSearchCache();