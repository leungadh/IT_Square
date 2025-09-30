#!/usr/bin/env node

/**
 * Test specific articles from popular posts section
 */

const https = require('https');

const CUSTOM_DOMAIN = 'https://it-square.hk';
const AMPLIFY_DOMAIN = 'https://main.d1gzwnduof06os.amplifyapp.com';

// Articles from popular posts API
const testArticles = [
  '20250905fhki',
  '20250905huawei', 
  '20250904mox',
  '20250903delf',
  '20250902tencent',
  'hashkey' // The one we know works on Amplify
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
          success: res.statusCode >= 200 && res.statusCode < 300,
          isNotFound: data.includes('Article Not Found') || data.includes('article not found'),
          title: data.match(/<title>([^<]+)<\/title>/)?.[1] || 'No title'
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

async function runTests() {
  console.log('🔍 Testing Popular Posts Articles\n');
  
  for (const domain of [AMPLIFY_DOMAIN, CUSTOM_DOMAIN]) {
    const isCustom = domain.includes('it-square.hk');
    console.log(`\n📍 ${isCustom ? 'Custom Domain' : 'Amplify Domain'}: ${domain}`);
    console.log('='.repeat(60));
    
    for (const slug of testArticles) {
      const url = `${domain}/article/${slug}`;
      const result = await testUrl(url);
      
      const icon = result.success ? '✅' : '❌';
      const status = result.isNotFound ? 'NOT FOUND' : result.status;
      
      console.log(`${icon} ${slug}: ${status}`);
      
      if (result.success && !result.isNotFound) {
        // Extract meaningful title
        const cleanTitle = result.title
          .replace(' | Making HK IT!', '')
          .substring(0, 50);
        console.log(`   📄 ${cleanTitle}${cleanTitle.length >= 50 ? '...' : ''}`);
      } else if (result.isNotFound) {
        console.log('   💬 Article not found in system');
      } else if (result.error) {
        console.log(`   💬 Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n🎯 Analysis:');
  console.log('If articles work on Amplify but not custom domain:');
  console.log('- CloudFront routing issue');
  console.log('- Environment variable differences');
  console.log('- Cache invalidation needed');
  console.log('');
  console.log('If articles fail on both domains:');
  console.log('- Articles not in posts API');
  console.log('- S3 content missing');
  console.log('- Slug format issues');
}

runTests().catch(console.error);