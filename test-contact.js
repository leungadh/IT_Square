const puppeteer = require('puppeteer');

async function testContactPage() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => {
      console.log('CONSOLE:', msg.type(), msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    // Track redirects
    let redirectCount = 0;
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectCount++;
        console.log('REDIRECT:', response.status(), response.url(), '->', response.headers().location);
      }
    });
    
    console.log('Testing: https://it-square.hk/contact');
    
    // Navigate to contact page
    const response = await page.goto('https://it-square.hk/contact', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Final URL:', page.url());
    console.log('Response status:', response.status());
    console.log('Redirect count:', redirectCount);
    
    // Wait a bit for any client-side redirects
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if URL changed (client-side redirect)
    const finalUrl = page.url();
    if (finalUrl !== 'https://it-square.hk/contact') {
      console.log('CLIENT-SIDE REDIRECT DETECTED:', finalUrl);
    }
    
    // Check for error messages
    const errorElements = await page.$$eval('[class*="error"], [class*="Error"]', 
      elements => elements.map(el => el.textContent)
    );
    
    if (errorElements.length > 0) {
      console.log('ERROR ELEMENTS FOUND:', errorElements);
    }
    
    // Check for "Something went wrong" message
    const errorBoundary = await page.$eval('body', body => 
      body.textContent.includes('Something went wrong')
    ).catch(() => false);
    
    if (errorBoundary) {
      console.log('ERROR BOUNDARY TRIGGERED: "Something went wrong" found');
    }
    
    // Check for GoogleMaps component
    const hasGoogleMaps = await page.$('.google-maps, [class*="GoogleMap"]').then(el => !!el);
    console.log('Google Maps component found:', hasGoogleMaps);
    
    // Check for loading states
    const hasLoadingSpinner = await page.$('[class*="animate-pulse"], [class*="loading"]').then(el => !!el);
    console.log('Loading spinner found:', hasLoadingSpinner);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'contact-page-debug.png', fullPage: true });
    console.log('Screenshot saved as contact-page-debug.png');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testContactPage();