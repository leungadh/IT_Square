#!/usr/bin/env node

/**
 * Check actual article content to see if it's loading properly
 */

const https = require('https');

async function getPageContent(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          content: data
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
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT'
      });
    });
  });
}

function analyzeContent(content) {
  // Extract key elements
  const title = content.match(/<title>([^<]+)<\/title>/)?.[1] || 'No title';
  const h1 = content.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || 'No H1';
  const hasNotFound = content.includes('Article Not Found') || content.includes('article not found');
  const hasLoadingSpinner = content.includes('Loading article') || content.includes('animate-spin');
  const hasActualContent = content.includes('港股醫療企業') || content.includes('HashKey') || content.includes('Web3');
  
  // Check for error states
  const hasError = content.includes('error') || content.includes('Error');
  const hasMinimalContent = content.length < 5000; // Very short page
  
  return {
    title: title.replace(' | Making HK IT!', ''),
    h1,
    hasNotFound,
    hasLoadingSpinner,
    hasActualContent,
    hasError,
    hasMinimalContent,
    contentLength: content.length,
    isWorking: !hasNotFound && !hasLoadingSpinner && hasActualContent
  };
}

async function checkArticles() {
  const testUrls = [
    'https://main.d1gzwnduof06os.amplifyapp.com/article/hashkey',
    'https://it-square.hk/article/hashkey',
    'https://main.d1gzwnduof06os.amplifyapp.com/article/20250905fhki',
    'https://it-square.hk/article/20250905fhki'
  ];
  
  console.log('🔍 Analyzing Article Content\n');
  
  for (const url of testUrls) {
    console.log(`📄 ${url}`);
    
    const result = await getPageContent(url);
    
    if (result.status !== 200) {
      console.log(`   ❌ Status: ${result.status}`);
      continue;
    }
    
    const analysis = analyzeContent(result.content);
    
    console.log(`   📝 Title: ${analysis.title}`);
    console.log(`   🏷️  H1: ${analysis.h1}`);
    console.log(`   📊 Content Length: ${analysis.contentLength} bytes`);
    
    if (analysis.isWorking) {
      console.log('   ✅ Article content loaded successfully');
    } else {
      console.log('   ❌ Issues detected:');
      if (analysis.hasNotFound) console.log('      - Shows "Article Not Found"');
      if (analysis.hasLoadingSpinner) console.log('      - Shows loading spinner');
      if (!analysis.hasActualContent) console.log('      - Missing actual article content');
      if (analysis.hasMinimalContent) console.log('      - Very short content (possible error page)');
    }
    
    console.log('');
  }
  
  console.log('🎯 Recommendations:');
  console.log('If articles show generic titles:');
  console.log('- Check if posts API is returning correct data');
  console.log('- Verify S3 content is accessible');
  console.log('- Check article component error handling');
  console.log('- Look for JavaScript errors in browser console');
}

checkArticles().catch(console.error);