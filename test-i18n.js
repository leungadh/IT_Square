#!/usr/bin/env node

/**
 * Test script for i18n middleware
 * This script helps you test different language detection scenarios locally
 */

const baseUrl = 'http://localhost:3000';

const testCases = [
  {
    name: 'Chinese via x-user-language header',
    headers: {
      'x-user-language': 'zh'
    },
    expected: '/zh/about'
  },
  {
    name: 'Chinese via x-user-language (chinese)',
    headers: {
      'x-user-language': 'chinese'
    },
    expected: '/zh/about'
  },
  {
    name: 'Chinese via x-user-language (中文)',
    headers: {
      'x-user-language': '中文'
    },
    expected: '/zh/about'
  },
  {
    name: 'English via x-user-language header',
    headers: {
      'x-user-language': 'en'
    },
    expected: '/en/about'
  },
  {
    name: 'English via x-user-language (english)',
    headers: {
      'x-user-language': 'english'
    },
    expected: '/en/about'
  },
  {
    name: 'Chinese via Accept-Language header',
    headers: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    expected: '/zh/about'
  },
  {
    name: 'English via Accept-Language header',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9'
    },
    expected: '/en/about'
  },
  {
    name: 'Default fallback (no headers)',
    headers: {},
    expected: '/en/about'
  },
  {
    name: 'Unsupported language fallback',
    headers: {
      'x-user-language': 'fr'
    },
    expected: '/en/about'
  }
];

async function testLanguageDetection() {
  console.log('🌐 Testing i18n Middleware Language Detection\n');
  console.log(`Base URL: ${baseUrl}`);
  console.log('Make sure your Next.js dev server is running with: npm run dev\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: ${testCase.name}`);
      console.log(`   Headers: ${JSON.stringify(testCase.headers)}`);
      
      const response = await fetch(`${baseUrl}/about`, {
        method: 'GET',
        headers: testCase.headers,
        redirect: 'manual' // Don't follow redirects automatically
      });

      if (response.status === 307 || response.status === 302) {
        const location = response.headers.get('location');
        const redirectPath = location?.replace(baseUrl, '') || location;
        
        if (redirectPath === testCase.expected) {
          console.log(`   ✅ SUCCESS: Redirected to ${redirectPath}`);
        } else {
          console.log(`   ❌ FAILED: Expected ${testCase.expected}, got ${redirectPath}`);
        }
      } else {
        console.log(`   ⚠️  UNEXPECTED: Status ${response.status}, expected redirect`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log('');
    }
  }
}

// Manual testing instructions
function printManualTestInstructions() {
  console.log('🧪 Manual Testing Instructions:\n');
  
  console.log('1. Start your development server:');
  console.log('   npm run dev\n');
  
  console.log('2. Test with curl commands:\n');
  
  testCases.forEach((testCase, index) => {
    const headerArgs = Object.entries(testCase.headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');
    
    console.log(`   # Test ${index + 1}: ${testCase.name}`);
    console.log(`   curl -I ${headerArgs} ${baseUrl}/about`);
    console.log(`   # Expected redirect to: ${testCase.expected}\n`);
  });
  
  console.log('3. Test in browser:');
  console.log('   - Open browser developer tools');
  console.log('   - Go to Network tab');
  console.log('   - Visit http://localhost:3000/about');
  console.log('   - Check the redirect response\n');
  
  console.log('4. Test language-specific pages directly:');
  console.log('   - http://localhost:3000/en/about (English)');
  console.log('   - http://localhost:3000/zh/about (Chinese)');
}

// Check if we're running this script directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node test-i18n.js [--manual]');
    console.log('');
    console.log('Options:');
    console.log('  --manual    Show manual testing instructions');
    console.log('  --help      Show this help message');
    process.exit(0);
  }
  
  if (args.includes('--manual')) {
    printManualTestInstructions();
  } else {
    testLanguageDetection().catch(console.error);
  }
}

module.exports = { testLanguageDetection, printManualTestInstructions };
