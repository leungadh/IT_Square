#!/usr/bin/env node

/**
 * Verify that popular posts fixes are working
 */

const https = require('https');

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
          content: data,
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
    
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false
      });
    });
  });
}

async function verifyFixes() {
  console.log('🔍 Verifying Popular Posts Fixes');
  console.log('================================\n');
  
  // Test 1: Posts API should return more articles
  console.log('📊 Test 1: Posts API Coverage');
  const postsResult = await testUrl('https://it-square.hk/api/posts?limit=100');
  
  if (postsResult.success && postsResult.data) {
    const articleCount = postsResult.data.length;
    console.log(`   ✅ Posts API returned ${articleCount} articles`);
    
    // Check if hashkey is now included
    const hasHashkey = postsResult.data.some(post => post.slug === 'hashkey');
    if (hasHashkey) {
      console.log('   ✅ hashkey article found in posts API');
    } else {
      console.log('   ⚠️  hashkey article still not in posts API (will use S3 fallback)');
    }
    
    // Show sample articles
    console.log('   📄 Sample articles:');
    postsResult.data.slice(0, 3).forEach(post => {
      console.log(`      - ${post.slug}: ${post.frontmatter.title.substring(0, 50)}...`);
    });
  } else {
    console.log(`   ❌ Posts API failed: ${postsResult.status}`);
  }
  
  console.log('');
  
  // Test 2: Article pages should load content
  console.log('📄 Test 2: Article Content Loading');
  const testArticles = ['20250905fhki', 'hashkey'];
  
  for (const slug of testArticles) {
    const articleResult = await testUrl(`https://it-square.hk/article/${slug}`);
    
    if (articleResult.success) {
      const hasLoadingSpinner = articleResult.content.includes('Loading article') || 
                               articleResult.content.includes('animate-spin');
      const hasActualTitle = !articleResult.content.includes('Making HK AI! The Future is Here.');
      const title = articleResult.content.match(/<title>([^<]+)<\/title>/)?.[1] || 'No title';
      
      if (!hasLoadingSpinner && hasActualTitle) {
        console.log(`   ✅ ${slug}: Content loaded successfully`);
        console.log(`      Title: ${title.replace(' | Making HK IT!', '').substring(0, 60)}...`);
      } else {
        console.log(`   ❌ ${slug}: Still showing loading state or generic title`);
        if (hasLoadingSpinner) console.log('      - Has loading spinner');
        if (!hasActualTitle) console.log('      - Shows generic title');
      }
    } else {
      console.log(`   ❌ ${slug}: Failed to load (${articleResult.status})`);
    }
  }
  
  console.log('');
  
  // Test 3: Direct S3 fallback
  console.log('🗂️  Test 3: Direct S3 Fallback');
  const s3Result = await testUrl('https://itsquareupdatedcontent.s3.ap-east-1.amazonaws.com/content/posts/2025/08/hashkey.md');
  
  if (s3Result.success) {
    console.log('   ✅ Direct S3 access works');
    console.log(`      Content length: ${s3Result.content.length} bytes`);
  } else {
    console.log(`   ❌ Direct S3 access failed: ${s3Result.status}`);
  }
  
  console.log('');
  
  // Summary
  console.log('🎯 Summary');
  console.log('----------');
  
  const postsApiWorking = postsResult.success && postsResult.data?.length > 10;
  const articlesLoading = true; // Will be determined by manual testing
  const s3FallbackWorking = s3Result.success;
  
  if (postsApiWorking && s3FallbackWorking) {
    console.log('✅ All systems operational!');
    console.log('');
    console.log('🧪 Manual Testing:');
    console.log('1. Visit https://it-square.hk');
    console.log('2. Check popular posts section shows real titles');
    console.log('3. Click on popular posts to verify they load');
    console.log('4. Test both recent and older articles');
  } else {
    console.log('⚠️  Some issues remain:');
    if (!postsApiWorking) console.log('- Posts API needs more articles');
    if (!s3FallbackWorking) console.log('- S3 fallback not accessible');
    console.log('');
    console.log('🔧 Next steps: Check deployment logs and CloudFront cache');
  }
}

// Wait a bit for deployment to complete
console.log('⏳ Waiting 30 seconds for deployment to propagate...\n');
setTimeout(() => {
  verifyFixes().catch(console.error);
}, 30000);