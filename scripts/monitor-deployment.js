#!/usr/bin/env node

/**
 * Monitor deployment and test custom domain fixes
 */

const https = require('https');

const CUSTOM_DOMAIN = 'https://it-square.hk';
const AMPLIFY_DOMAIN = 'https://main.d1gzwnduof06os.amplifyapp.com';

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // Not JSON
        }
        
        resolve({
          url,
          status: res.statusCode,
          data: parsedData,
          rawData: data.substring(0, 200),
          success: res.statusCode >= 200 && res.statusCode < 300
        });
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

async function checkDeploymentStatus() {
  console.log('🔍 Checking deployment status...');
  
  const tests = [
    {
      name: 'S3 API Endpoint',
      url: `${CUSTOM_DOMAIN}/api/article/s3?key=content/posts/2025/08/hashkey.md`,
      expectedStatus: 200
    },
    {
      name: 'Article Page',
      url: `${CUSTOM_DOMAIN}/article/hashkey`,
      expectedStatus: 200
    },
    {
      name: 'Posts API',
      url: `${CUSTOM_DOMAIN}/api/posts?limit=5`,
      expectedStatus: 200
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await testUrl(test.url);
    const passed = result.status === test.expectedStatus;
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} ${test.name}: ${result.status}`);
    
    if (!passed) {
      allPassed = false;
      if (result.data?.error) {
        console.log(`   Error: ${result.data.error}`);
      }
    } else if (test.name === 'S3 API Endpoint' && result.data?.slug) {
      console.log(`   Article: ${result.data.slug}`);
    }
  }
  
  return allPassed;
}

async function waitForDeployment() {
  console.log('⏳ Waiting for deployment to complete...\n');
  
  const maxAttempts = 20; // 10 minutes max
  const interval = 30000; // 30 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxAttempts} (${new Date().toLocaleTimeString()})`);
    
    const success = await checkDeploymentStatus();
    
    if (success) {
      console.log('\n🎉 Deployment successful! All tests passed.');
      console.log('\n📊 Final verification:');
      console.log(`   Custom domain: ${CUSTOM_DOMAIN}/article/hashkey`);
      console.log(`   Amplify domain: ${AMPLIFY_DOMAIN}/article/hashkey`);
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log(`\n⏱️  Waiting ${interval/1000} seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log('\n⚠️  Deployment monitoring timed out.');
  console.log('   Check AWS Amplify console for build status.');
  console.log('   Manual verification may be needed.');
  return false;
}

async function main() {
  console.log('🚀 Custom Domain Deployment Monitor');
  console.log('===================================\n');
  
  // Initial check
  console.log('📋 Pre-deployment status:');
  await checkDeploymentStatus();
  
  // Wait for deployment
  const success = await waitForDeployment();
  
  if (success) {
    console.log('\n🎯 Next steps:');
    console.log('1. Test popular posts section on custom domain');
    console.log('2. Verify all article links work correctly');
    console.log('3. Check CloudFront cache behavior');
    console.log('4. Monitor for any remaining issues');
  } else {
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check AWS Amplify build logs');
    console.log('2. Verify environment variables');
    console.log('3. Test CloudFront cache invalidation');
    console.log('4. Review CUSTOM_DOMAIN_FIX.md for additional steps');
  }
}

main().catch(console.error);