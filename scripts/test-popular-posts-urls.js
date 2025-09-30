#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

const BASE_URL = 'https://www.it-square.hk';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Popular-Posts-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function makeHeadRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Popular-Posts-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testPopularPostsUrls() {
  console.log('🔍 Testing popular posts URLs...\n');
  
  try {
    // First, get the popular posts
    console.log('📡 Fetching popular posts...');
    const response = await makeRequest(`${BASE_URL}/api/popular-posts?limit=5`);
    
    if (response.parseError) {
      console.log('❌ Failed to parse popular posts API response');
      return;
    }
    
    if (!Array.isArray(response.data)) {
      console.log('❌ Popular posts API did not return an array');
      return;
    }
    
    console.log(`✅ Found ${response.data.length} popular posts\n`);
    
    // Test each post URL
    for (let i = 0; i < Math.min(3, response.data.length); i++) {
      const post = response.data[i];
      
      console.log(`Testing post ${i + 1}:`);
      console.log(`  Title: ${post.frontmatter?.title || 'No title'}`);
      console.log(`  Slug: "${post.slug}" (${post.slug?.length || 0} chars)`);
      console.log(`  Year: "${post.year}"`);
      console.log(`  Month: "${post.month}"`);
      
      // Check for whitespace issues
      const hasWhitespace = /\s/.test(post.slug || '');
      if (hasWhitespace) {
        console.log(`  ⚠️  Slug contains whitespace!`);
        console.log(`  Raw slug bytes:`, Buffer.from(post.slug || '', 'utf8'));
      }
      
      // Generate article URL
      const cleanSlug = (post.slug || '').trim().replace(/\s+/g, '-');
      const articleUrl = `${BASE_URL}/article/${post.year}/${post.month}/${cleanSlug}`;
      console.log(`  URL: ${articleUrl}`);
      
      try {
        const articleResponse = await makeHeadRequest(articleUrl);
        console.log(`  Status: ${articleResponse.status}`);
        
        if (articleResponse.status === 200) {
          console.log(`  ✅ Article accessible`);
        } else if (articleResponse.status === 404) {
          console.log(`  ❌ Article not found (404)`);
        } else {
          console.log(`  ⚠️  Unexpected status: ${articleResponse.status}`);
        }
      } catch (error) {
        console.log(`  ❌ Request failed: ${error.message}`);
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testPopularPostsUrls().catch(console.error);