const puppeteer = require('puppeteer');

async function testAmplifyContact() {
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
    
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    console.log('Testing Amplify domain: https://amplify-test.d1gzwnduof06os.amplifyapp.com/contact');
    
    await page.goto('https://amplify-test.d1gzwnduof06os.amplifyapp.com/contact', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page loaded successfully');
    
    // Wait for potential Google Maps loading
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for error messages
    const hasErrorBoundary = await page.evaluate(() => 
      document.body.textContent.includes('Something went wrong')
    );
    
    if (hasErrorBoundary) {
      console.log('🔴 ERROR BOUNDARY TRIGGERED on Amplify domain too');
    } else {
      console.log('✅ No error boundary on Amplify domain');
    }
    
    // Check for Google Maps elements
    const googleMapsElements = await page.$$eval('*', elements => 
      elements.filter(el => 
        el.textContent && (
          el.textContent.includes('Loading map') ||
          el.textContent.includes('Google Maps') ||
          el.textContent.includes('Error loading Google Maps')
        )
      ).map(el => el.textContent.substring(0, 100))
    );
    
    if (googleMapsElements.length > 0) {
      console.log('Google Maps elements found:', googleMapsElements);
    } else {
      console.log('No Google Maps elements found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'amplify-contact-debug.png', fullPage: true });
    console.log('Screenshot saved as amplify-contact-debug.png');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAmplifyContact();