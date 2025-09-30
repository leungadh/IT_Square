const https = require('https');

async function checkDeployment() {
  console.log('Checking deployment status...');
  
  try {
    // Check if JS chunks are now loading correctly
    const response = await fetch('https://it-square.hk/contact');
    const html = await response.text();
    
    // Extract chunk references from HTML
    const chunkMatches = html.match(/_next\/static\/chunks\/[^"]+/g) || [];
    console.log('Found chunks in HTML:', chunkMatches.slice(0, 3));
    
    if (chunkMatches.length > 0) {
      // Test if first chunk is accessible
      const firstChunk = chunkMatches[0];
      const chunkUrl = `https://it-square.hk/${firstChunk}`;
      
      try {
        const chunkResponse = await fetch(chunkUrl, { method: 'HEAD' });
        console.log(`Chunk ${firstChunk}: ${chunkResponse.status}`);
        
        if (chunkResponse.status === 200) {
          console.log('✅ Deployment successful - JS chunks are loading');
          return true;
        } else {
          console.log('❌ Deployment still in progress - chunks not ready');
          return false;
        }
      } catch (error) {
        console.log('❌ Chunk test failed:', error.message);
        return false;
      }
    } else {
      console.log('❌ No chunks found in HTML');
      return false;
    }
  } catch (error) {
    console.error('Check failed:', error.message);
    return false;
  }
}

// Use node-fetch polyfill for older Node versions
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

checkDeployment();