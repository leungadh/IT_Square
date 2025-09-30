#!/usr/bin/env node

// Test local search functionality
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';

const testQueries = [
  '醫療',      // Chinese: medical/healthcare
  '科技',      // Chinese: technology  
  '香港',      // Chinese: Hong Kong
  'AI',        // English: AI
  'blockchain', // English: blockchain
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 3000,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json; charset=utf-8',
        'User-Agent': 'Local-Search-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testLocalSearch() {
  console.log('🔍 Testing local search at localhost:3000...\n');
  
  for (const query of testQueries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${BASE_URL}/api/search?q=${encodedQuery}&limit=3`;
      
      console.log(`Testing: "${query}" (${Array.from(query).length} chars)`);
      console.log(`Encoded: ${encodedQuery}`);
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
}

// Also test if we have any test data
console.log('📁 Checking for test data...');
const fs = require('fs');
const path = require('path');

const testDataPath = path.join(process.cwd(), 'test-data', 'posts', '2025');
if (fs.existsSync(testDataPath)) {
  const files = fs.readdirSync(testDataPath, { recursive: true });
  const mdFiles = files.filter(f => f.toString().endsWith('.md'));
  console.log(`✅ Found ${mdFiles.length} markdown files in test-data`);
  
  // Check a few files for Chinese content
  let chineseFiles = 0;
  for (let i = 0; i < Math.min(5, mdFiles.length); i++) {
    const filePath = path.join(testDataPath, mdFiles[i].toString());
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (/[\u4e00-\u9fff]/.test(content)) {
        chineseFiles++;
      }
    } catch (e) {
      // ignore
    }
  }
  console.log(`📝 ${chineseFiles} of first 5 files contain Chinese characters`);
} else {
  console.log('❌ No test-data directory found');
}

console.log('\n🚀 Starting search tests...\n');
testLocalSearch().catch(console.error);