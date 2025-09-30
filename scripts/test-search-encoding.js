#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.SITE_URL || 'https://www.it-square.hk';

// Test queries with different character sets
const testQueries = [
  '醫療',      // Chinese: medical/healthcare
  '科技',      // Chinese: technology  
  '香港',      // Chinese: Hong Kong
  'AI',        // English: AI
  'blockchain', // English: blockchain
  '香港 AI',   // Mixed: Hong Kong AI
  'fintech',   // English: fintech
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json; charset=utf-8',
        'User-Agent': 'Search-Test-Script/1.0'
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

async function testSearchEncoding() {
  console.log('🔍 Testing search encoding for different character sets...\n');
  
  for (const query of testQueries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${BASE_URL}/api/search?q=${encodedQuery}&limit=3`;
      
      console.log(`Testing: "${query}" (${Array.from(query).length} chars)`);
      console.log(`URL: ${url}`);
      
      const startTime = Date.now();
      const response = await makeRequest(url);
      const duration = Date.now() - startTime;
      
      console.log(`Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      console.log(`Duration: ${duration}ms`);
      
      if (response.parseError) {
        console.log(`❌ JSON Parse Error: ${response.parseError}`);
        console.log(`Raw response: ${response.data.substring(0, 200)}...`);
      } else if (response.data.error) {
        console.log(`❌ API Error: ${response.data.error}`);
      } else {
        console.log(`✅ Results: ${response.data.results?.length || 0} found`);
        if (response.data.results?.length > 0) {
          const firstResult = response.data.results[0];
          console.log(`   First result: "${firstResult.title}"`);
          console.log(`   Relevance: ${firstResult.relevance}`);
        }
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      console.log('---');
    }
  }
  
  console.log('\n🧪 Testing static search index loading...');
  
  try {
    const indexUrl = `${BASE_URL}/content/search/search-index.json`;
    console.log(`Testing index: ${indexUrl}`);
    
    const response = await makeRequest(indexUrl);
    console.log(`Index Status: ${response.status}`);
    console.log(`Index Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200) {
      console.log('✅ Search index accessible');
    } else {
      console.log('❌ Search index not accessible');
    }
    
  } catch (error) {
    console.log(`❌ Index test failed: ${error.message}`);
  }
}

testSearchEncoding().catch(console.error);