const puppeteer = require('puppeteer');

async function testChunks() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    let jsErrors = [];
    let failedRequests = [];
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        error: request.failure().errorText
      });
    });
    
    console.log('Testing JavaScript chunk loading...');
    
    await page.goto('https://it-square.hk/contact', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for potential JS execution
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.forEach(req => {
      console.log(`❌ ${req.url} - ${req.error}`);
    });
    
    console.log('\n=== JAVASCRIPT ERRORS ===');
    jsErrors.forEach(error => {
      console.log(`🔴 ${error}`);
    });
    
    // Check if React has loaded
    const hasReact = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || 
             typeof window.__NEXT_DATA__ !== 'undefined' ||
             document.querySelector('[data-reactroot]') !== null;
    });
    
    console.log('\n=== REACT STATUS ===');
    console.log(`React loaded: ${hasReact ? '✅' : '❌'}`);
    
    // Check error boundary
    const hasErrorBoundary = await page.evaluate(() => 
      document.body.textContent.includes('Something went wrong')
    );
    
    console.log(`Error boundary: ${hasErrorBoundary ? '🔴 TRIGGERED' : '✅ OK'}`);
    
    // Test specific chunk
    const testChunk = await page.evaluate(async () => {
      try {
        const response = await fetch('/_next/static/chunks/webpack-aaf14c854327d1ed.js');
        return {
          status: response.status,
          ok: response.ok,
          size: response.headers.get('content-length')
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\n=== CHUNK TEST ===');
    console.log('Webpack chunk:', testChunk);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testChunks();