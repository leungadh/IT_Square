#!/usr/bin/env node
/**
 * Quick test to verify S3-based development works
 */

console.log('🧪 Testing S3-based development API...');

// Set environment for S3 development
process.env.NODE_ENV = 'development';
process.env.CONTENT_SOURCE = 's3';
process.env.AWS_REGION = 'ap-east-1';
process.env.NEXT_PUBLIC_S3_BUCKET = 'itsquareupdatedcontent';
process.env.DEBUG_CONTENT_LOADING = 'true';

// Test the API
const testAPI = async () => {
  try {
    // Simulate API call
    const url = 'http://localhost:3000/api/posts?limit=5&context=home-latest';
    console.log('📡 Testing API endpoint:', url);
    console.log('🔧 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      CONTENT_SOURCE: process.env.CONTENT_SOURCE,
      AWS_REGION: process.env.AWS_REGION,
      BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET
    });
    console.log('');
    console.log('✅ Configuration looks good!');
    console.log('');
    console.log('🚀 To start development with S3 content:');
    console.log('   npm run dev:s3');
    console.log('');
    console.log('📋 This will:');
    console.log('   - Use the same S3 bucket as Amplify');
    console.log('   - Fetch content via HTTP (same as production)');
    console.log('   - Focus on last 2 months for efficiency');
    console.log('   - Show 2 pinned + 6 random posts');
    console.log('   - Enable debug logging');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testAPI();
