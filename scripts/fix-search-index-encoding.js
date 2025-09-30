#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing search index encoding...');

const searchDocsPath = path.join(process.cwd(), 'public/content/search/search-docs.json');
const searchIndexPath = path.join(process.cwd(), 'public/content/search/search-index.json');

if (!fs.existsSync(searchDocsPath)) {
  console.error('❌ Search docs file not found:', searchDocsPath);
  process.exit(1);
}

try {
  // Read the current search docs
  const docsContent = fs.readFileSync(searchDocsPath, 'utf8');
  const docsData = JSON.parse(docsContent);
  
  console.log(`📄 Found ${docsData.docs.length} documents in search index`);
  
  // Fix encoding in each document
  let fixedCount = 0;
  const fixedDocs = docsData.docs.map(doc => {
    const fixed = { ...doc };
    
    // Decode URL-encoded Chinese characters in various fields
    const fieldsToFix = ['id', 'slug', 'title', 'excerpt'];
    
    for (const field of fieldsToFix) {
      if (fixed[field] && typeof fixed[field] === 'string') {
        const original = fixed[field];
        
        // Try to decode URL-encoded characters
        try {
          // Replace URL-encoded sequences with proper characters
          let decoded = original.replace(/-([0-9a-f]{2})/gi, '%$1');
          decoded = decodeURIComponent(decoded);
          
          if (decoded !== original) {
            fixed[field] = decoded;
            fixedCount++;
          }
        } catch (e) {
          // If decoding fails, keep original
          console.warn(`⚠️  Could not decode ${field} for doc ${doc.id}: ${e.message}`);
        }
      }
    }
    
    return fixed;
  });
  
  console.log(`✅ Fixed encoding for ${fixedCount} fields`);
  
  // Write the fixed docs back
  const fixedDocsData = { ...docsData, docs: fixedDocs };
  fs.writeFileSync(searchDocsPath, JSON.stringify(fixedDocsData, null, 2), 'utf8');
  
  console.log('💾 Updated search-docs.json with proper encoding');
  
  // Show a sample of fixed content
  const sampleDoc = fixedDocs.find(doc => /[\u4e00-\u9fff]/.test(doc.title));
  if (sampleDoc) {
    console.log('📝 Sample fixed document:');
    console.log(`   Title: ${sampleDoc.title}`);
    console.log(`   Excerpt: ${sampleDoc.excerpt.substring(0, 100)}...`);
  }
  
} catch (error) {
  console.error('❌ Error fixing search index:', error);
  process.exit(1);
}

console.log('🎉 Search index encoding fix complete!');
console.log('💡 You may need to rebuild the Lunr index for full effect');
console.log('   Run: npm run index:build-static');