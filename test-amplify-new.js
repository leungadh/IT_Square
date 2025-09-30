const puppeteer = require('puppeteer');

async function testAmplifyNew() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('Testing new deployment on Amplify domain...');
    
    await page.goto('https://amplify-test.d1gzwnduof06os.amplifyapp.com/contact', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check for error boundary
    const hasErrorBoundary = await page.evaluate(() => 
      document.body.textContent.includes('Something went wrong')
    );
    
    // Check for new content
    const hasNewContent = await page.evaluate(() => 
      document.body.textContent.includes('CNT Commercial Building')
    );
    
    console.log(`Error boundary: ${hasErrorBoundary ? '🔴 TRIGGERED' : '✅ OK'}`);
    console.log(`New content: ${hasNewContent ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAmplifyNew();