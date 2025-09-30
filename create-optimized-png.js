const fs = require('fs');
const { createCanvas } = require('canvas');

// Create canvas
const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// Create gradient background
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, '#2563eb');
gradient.addColorStop(1, '#1d4ed8');

// Fill background
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// Add text
ctx.fillStyle = 'white';
ctx.font = 'bold 72px Arial';
ctx.textAlign = 'center';
ctx.fillText('Making HK IT!', 600, 250);

ctx.fillStyle = '#93c5fd';
ctx.font = '36px Arial';
ctx.fillText('The Future is Here', 600, 320);

ctx.fillStyle = '#dbeafe';
ctx.font = '24px Arial';
ctx.fillText('Leading Hong Kong Technology News Platform', 600, 380);

ctx.fillStyle = '#bfdbfe';
ctx.font = '20px Arial';
ctx.fillText('AI • Startups • Digital Transformation • Market Analysis', 600, 450);

// Save as PNG
const buffer = canvas.toBuffer('image/png', { compressionLevel: 9, quality: 0.8 });
fs.writeFileSync('./public/og-image-optimized.png', buffer);

console.log('✅ Created optimized PNG: og-image-optimized.png');
console.log(`📊 File size: ${Math.round(buffer.length / 1024)}KB`);
console.log('🎯 Optimized for WhatsApp link previews');