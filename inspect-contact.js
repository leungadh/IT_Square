const puppeteer = require('puppeteer');

async function inspectContactPage() {
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true    // Open DevTools
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable request interception to log all requests
    await page.setRequestInterception(true);
    page.on('request', request => {
      console.log('REQUEST:', request.method(), request.url());
      request.continue();
    });
    
    // Listen for all events
    page.on('console', msg => {
      console.log('CONSOLE:', msg.type().toUpperCase(), msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('HTTP ERROR:', response.status(), response.url());
      }
      if (response.status() >= 300 && response.status() < 400) {
        console.log('REDIRECT:', response.status(), response.url(), '->', response.headers().location);
      }
    });
    
    // Track navigation events
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log('NAVIGATION:', frame.url());
      }
    });
    
    console.log('Navigating to: https://it-square.hk/contact');
    
    // Navigate and wait for network to be idle
    await page.goto('https://it-square.hk/contact', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Initial load complete. Current URL:', page.url());
    
    // Wait for any client-side redirects
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalUrl = page.url();
    console.log('Final URL after 5 seconds:', finalUrl);
    
    // Check for redirect behavior
    if (finalUrl !== 'https://it-square.hk/contact') {
      console.log('🔴 CLIENT-SIDE REDIRECT DETECTED!');
      console.log('From: https://it-square.hk/contact');
      console.log('To:', finalUrl);
    } else {
      console.log('✅ No redirect detected');
    }
    
    // Check page content
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check for error messages
    const bodyText = await page.evaluate(() => document.body.textContent);
    
    if (bodyText.includes('Something went wrong')) {
      console.log('🔴 ERROR BOUNDARY TRIGGERED');
    }
    
    if (bodyText.includes('Loading')) {
      console.log('🟡 LOADING STATE DETECTED');
    }
    
    // Check for GoogleMaps component
    const googleMapsElements = await page.$$eval('*', elements => 
      elements.filter(el => 
        el.className && (
          el.className.includes('google') || 
          el.className.includes('map') ||
          el.textContent.includes('Google Maps') ||
          el.textContent.includes('Loading map')
        )
      ).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent.substring(0, 100)
      }))
    );
    
    if (googleMapsElements.length > 0) {
      console.log('Google Maps elements found:', googleMapsElements);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'contact-inspect.png', fullPage: true });
    console.log('Screenshot saved as contact-inspect.png');
    
    // Keep browser open for manual inspection
    console.log('Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Wait indefinitely until user closes
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Inspection failed:', error.message);
  } finally {
    await browser.close();
  }
}

inspectContactPage();