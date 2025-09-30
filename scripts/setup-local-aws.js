#!/usr/bin/env node
/**
 * Setup AWS credentials for local development to access S3
 * This ensures local dev can use the same S3 content as Amplify
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Setting up AWS credentials for local S3 development...');

const awsDir = path.join(os.homedir(), '.aws');
const credentialsFile = path.join(awsDir, 'credentials');
const configFile = path.join(awsDir, 'config');

// Check if AWS directory exists
if (!fs.existsSync(awsDir)) {
  console.log('📁 Creating ~/.aws directory...');
  fs.mkdirSync(awsDir, { recursive: true });
}

// Check existing credentials
if (fs.existsSync(credentialsFile)) {
  console.log('✅ AWS credentials file already exists at ~/.aws/credentials');
  const credentials = fs.readFileSync(credentialsFile, 'utf8');
  if (credentials.includes('[default]')) {
    console.log('✅ Default profile found in credentials');
  } else {
    console.log('⚠️  No default profile found in credentials file');
  }
} else {
  console.log('❌ AWS credentials file not found');
  console.log('📝 Please create ~/.aws/credentials with your AWS access keys:');
  console.log('');
  console.log('[default]');
  console.log('aws_access_key_id = YOUR_ACCESS_KEY_ID');
  console.log('aws_secret_access_key = YOUR_SECRET_ACCESS_KEY');
  console.log('');
}

// Check existing config
if (fs.existsSync(configFile)) {
  console.log('✅ AWS config file already exists at ~/.aws/config');
  const config = fs.readFileSync(configFile, 'utf8');
  if (config.includes('ap-east-1')) {
    console.log('✅ Hong Kong region (ap-east-1) configured');
  } else {
    console.log('⚠️  Hong Kong region not found in config');
  }
} else {
  console.log('📝 Creating AWS config file...');
  const configContent = `[default]
region = ap-east-1
output = json
`;
  fs.writeFileSync(configFile, configContent);
  console.log('✅ Created ~/.aws/config with Hong Kong region');
}

console.log('');
console.log('🧪 Testing S3 access...');

// Test S3 access
const { exec } = require('child_process');
exec('aws s3 ls s3://itsquareupdatedcontent/ --region ap-east-1 --max-items 5', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ S3 access test failed:');
    console.log('   Error:', error.message);
    console.log('');
    console.log('💡 To fix this:');
    console.log('   1. Ensure AWS CLI is installed: npm install -g aws-cli');
    console.log('   2. Configure credentials: aws configure');
    console.log('   3. Set region to ap-east-1');
    console.log('   4. Verify bucket access permissions');
  } else {
    console.log('✅ S3 access test successful!');
    console.log('📦 Found content in bucket:');
    console.log(stdout.trim().split('\n').slice(0, 3).join('\n'));
  }
  
  console.log('');
  console.log('🚀 Ready to start development with S3:');
  console.log('   npm run dev:s3');
  console.log('');
  console.log('📚 This will use the same S3 content as your Amplify deployment');
});
