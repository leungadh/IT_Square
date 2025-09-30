#!/usr/bin/env node
/**
 * Setup S3 bucket policy to allow public read access to metadata files
 * This replaces the ACL approach since the bucket doesn't allow ACLs
 */

const { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'itsquareupdatedcontent';

const s3 = new S3Client({ region: REGION });

const bucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "PublicReadGetObject",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: [
        `arn:aws:s3:::${BUCKET}/content/metadata/*`,
        `arn:aws:s3:::${BUCKET}/content/search/*`,
        `arn:aws:s3:::${BUCKET}/content/images/*`,
        `arn:aws:s3:::${BUCKET}/content/posts/*`,  // Added for MD files
        `arn:aws:s3:::${BUCKET}/static/images/*`,  // Added for images in static
        `arn:aws:s3:::${BUCKET}/deployment-logs/.local-state.json`
      ]
    }
  ]
};

async function setupBucketPolicy() {
  try {
    console.log(`🔧 Setting up public read policy for S3 bucket: ${BUCKET}`);
    console.log(`📍 Region: ${REGION}`);
    
    // Get existing policy
    try {
      const existing = await s3.send(new GetBucketPolicyCommand({ Bucket: BUCKET }));
      console.log('📄 Current bucket policy exists');
      
      // Parse and merge policies (simple approach - you might want more sophisticated merging)
      const existingPolicy = JSON.parse(existing.Policy);
      console.log('⚠️  Existing policy found. You may need to manually merge policies.');
      console.log('📋 Existing policy:', JSON.stringify(existingPolicy, null, 2));
      console.log('📋 New policy to apply:', JSON.stringify(bucketPolicy, null, 2));
      
    } catch (error) {
      if (error.name === 'NoSuchBucketPolicy') {
        console.log('📄 No existing bucket policy found');
      } else {
        console.warn('⚠️  Could not read existing policy:', error.message);
      }
    }
    
    // Apply the policy
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(bucketPolicy, null, 2)
    }));
    
    console.log('✅ Successfully applied bucket policy!');
    console.log('🌐 The following paths are now publicly readable:');
    console.log(`   • https://${BUCKET}.s3.${REGION}.amazonaws.com/content/metadata/*`);
    console.log(`   • https://${BUCKET}.s3.${REGION}.amazonaws.com/deployment-logs/.local-state.json`);
    
  } catch (error) {
    console.error('❌ Failed to setup bucket policy:', error.message);
    console.log('💡 Make sure you have s3:PutBucketPolicy permissions');
    process.exit(1);
  }
}

if (require.main === module) {
  setupBucketPolicy();
}

module.exports = { setupBucketPolicy };
