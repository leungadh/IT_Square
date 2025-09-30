#!/usr/bin/env node

/**
 * Quick test to verify deployment is working
 */

const https = require('https');

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({
        url,
        status: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false
      });
    });
  });
}

async function quickTest() {
  console.log('🚀 Quick Deployment Test');
  console.log('========================\n');
  
  const tests = [
    'https://it-square.hk',
    'https://it-square.hk/api/posts?limit=5',
    'https://it-square.hk/article/20250905fhki'
  ];
  
  for (const url of tests) {
    const result = await testUrl(url);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${url}: ${result.status}`);
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Wait 2-3 minutes for full deployment');
  console.log('2. Test popular posts section manually');
  console.log('3. Check if articles load with correct titles');
  console.log('4. Verify both custom domain and Amplify domain work');
}

quickTest().catch(console.error);