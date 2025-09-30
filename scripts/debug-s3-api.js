#!/usr/bin/env node

/**
 * Debug script for S3 API endpoint differences between domains
 */

const https = require('https');

const testCases = [
  {
    name: 'Standard encoding',
    path: '/api/article/s3?key=content/posts/2025/08/hashkey.md'
  },
  {
    name: 'URL encoded',
    path: '/api/article/s3?key=' + encodeURIComponent('content/posts/2025/08/hashkey.md')
  },
  {
    name: 'Double encoded',
    path: '/api/article/s3?key=' + encodeURIComponent(encodeURIComponent('content/posts/2025/08/hashkey.md'))
  },
  {
    name: 'With spaces (encoded)',
    path: '/api/article/s3?key=' + encodeURIComponent('content/posts/2025/08/hash key.md')
  }
];

const domains = [
  'https://main.d1gzwnduof06os.amplifyapp.com',
  'https://it-square.hk'
];

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
          headers: res.headers,
          data: parsedData || data.substring(0, 200),
          isJson: res.headers['content-type']?.includes('application/json')
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT'
      });
    });
  });
}

async function runDebug() {
  console.log('🔍 Debugging S3 API Endpoint Differences\n');
  
  for (const domain of domains) {
    console.log(`\n📍 Domain: ${domain}`);
    console.log('='.repeat(60));
    
    for (const testCase of testCases) {
      const url = `${domain}${testCase.path}`;
      console.log(`\n🧪 Test: ${testCase.name}`);
      console.log(`   URL: ${url}`);
      
      const result = await testUrl(url);
      
      if (result.status === 200) {
        console.log('   ✅ SUCCESS');
        if (result.isJson && result.data?.slug) {
          console.log(`   📄 Article: ${result.data.slug}`);
          console.log(`   📝 Title: ${result.data.frontmatter?.title || 'No title'}`);
        }
      } else if (result.status === 400) {
        console.log('   ❌ BAD REQUEST');
        if (result.data?.error) {
          console.log(`   💬 Error: ${result.data.error}`);
        }
      } else {
        console.log(`   ⚠️  Status: ${result.status}`);
        if (result.error) {
          console.log(`   💬 Error: ${result.error}`);
        }
      }
    }
  }
  
  console.log('\n\n🎯 Analysis:');
  console.log('If custom domain shows different behavior:');
  console.log('1. CloudFront might be modifying query parameters');
  console.log('2. URL encoding/decoding differences between domains');
  console.log('3. Different routing behavior in Next.js');
  console.log('4. Environment variable differences');
}

runDebug().catch(console.error);