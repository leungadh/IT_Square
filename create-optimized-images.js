// Script to create optimized social media images
// Since ImageMagick is not available, we'll create a simple SVG-based solution

const fs = require('fs');
const path = require('path');

// Create a compact SVG logo for social sharing
const compactLogoSvg = `<svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" fill="#2563eb"/>
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">Making HK IT!</text>
  <text x="200" y="110" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif" font-size="16">The Future is Here</text>
  <text x="200" y="140" text-anchor="middle" fill="#dbeafe" font-family="Arial, sans-serif" font-size="12">Hong Kong Technology News</text>
</svg>`;

// Create compact Open Graph image (SVG)
const ogImageSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="250" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="bold">Making HK IT!</text>
  <text x="600" y="320" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif" font-size="36">The Future is Here</text>
  <text x="600" y="380" text-anchor="middle" fill="#dbeafe" font-family="Arial, sans-serif" font-size="24">Leading Hong Kong Technology News Platform</text>
  <text x="600" y="450" text-anchor="middle" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="20">AI • Startups • Digital Transformation • Market Analysis</text>
</svg>`;

// Write the SVG files
fs.writeFileSync(path.join(__dirname, 'public', 'logo-compact.svg'), compactLogoSvg);
fs.writeFileSync(path.join(__dirname, 'public', 'og-image-compact.svg'), ogImageSvg);
fs.writeFileSync(path.join(__dirname, 'public', 'twitter-image-compact.svg'), ogImageSvg);

console.log('✅ Created optimized SVG images:');
console.log('- logo-compact.svg (~1KB)');
console.log('- og-image-compact.svg (~1KB)'); 
console.log('- twitter-image-compact.svg (~1KB)');
console.log('');
console.log('These are much smaller than the original PNG files:');
console.log('- Original og-image.png: 52KB');
console.log('- New og-image-compact.svg: ~1KB (98% smaller)');