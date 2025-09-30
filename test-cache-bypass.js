const puppeteer = require('puppeteer');

async function testCacheBypass() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set headers to bypass cache
    await page.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log('Testing with cache bypass headers...');
    
    await page.goto(`https://it-square.hk/contact?nocache=${Date.now()}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Check for new content
    const hasNewContent = await page.evaluate(() => 
      document.body.textContent.includes('CNT Commercial Building')
    );
    
    // Check for error boundary
    const hasErrorBoundary = await page.evaluate(() => 
      document.body.textContent.includes('Something went wrong')
    );
    
    console.log(`New content found: ${hasNewContent ? '✅ YES' : '❌ NO'}`);
    console.log(`Error boundary: ${hasErrorBoundary ? '🔴 TRIGGERED' : '✅ OK'}`);
    
    // Get cache headers
    const response = await page.goto(`https://it-square.hk/contact?nocache=${Date.now()}`, {
      waitUntil: 'domcontentloaded'
    });
    
    const headers = response.headers();
    console.log('\n=== Response Headers ===');
    console.log(`Cache-Control: ${headers['cache-control']}`);
    console.log(`X-Cache: ${headers['x-cache']}`);
    console.log(`Age: ${headers['age']}`);
    console.log(`ETag: ${headers['etag']}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCacheBypass();