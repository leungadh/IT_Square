#!/usr/bin/env node

/**
 * Test script to verify custom domain article access
 */

const https = require('https');

const domains = [
  'https://main.d1gzwnduof06os.amplifyapp.com',
  'https://it-square.hk'
];

const testPaths = [
  '/api/posts?limit=5',
  '/article/hashkey',
  '/api/article/s3?key=content/posts/2025/08/hashkey.md'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          bodyLength: data.length,
          isJson: res.headers['content-type']?.includes('application/json'),
          hasError: res.statusCode >= 400
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message,
        hasError: true
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        hasError: true
      });
    });
  });
}

async function runTests() {
  console.log('🔍 Testing Custom Domain vs Amplify Domain\n');
  
  for (const domain of domains) {
    console.log(`\n📍 Testing domain: ${domain}`);
    console.log('='.repeat(50));
    
    for (const path of testPaths) {
      const url = `${domain}${path}`;
      const result = await testUrl(url);
      
      const status = result.hasError ? '❌' : '✅';
      console.log(`${status} ${path}`);
      console.log(`   Status: ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Content-Type: ${result.headers?.['content-type'] || 'unknown'}`);
        console.log(`   Body Length: ${result.bodyLength} bytes`);
      }
      console.log('');
    }
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('1. If Amplify domain works but custom domain fails:');
  console.log('   - Check CloudFront distribution configuration');
  console.log('   - Verify custom domain SSL certificate');
  console.log('   - Check DNS CNAME records');
  console.log('');
  console.log('2. If API endpoints fail on custom domain:');
  console.log('   - Update NEXT_PUBLIC_BASE_URL environment variable');
  console.log('   - Invalidate CloudFront cache for /api/* paths');
  console.log('   - Check CORS configuration');
  console.log('');
  console.log('3. If article pages fail:');
  console.log('   - Verify S3 bucket permissions');
  console.log('   - Check article metadata and content structure');
  console.log('   - Test direct S3 API access');
}

runTests().catch(console.error);