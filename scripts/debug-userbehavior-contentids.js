#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Configure DynamoDB client
function getDynamoDBConfig() {
  return {
    region: process.env.AWS_REGION || 'ap-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };
}

function normalizeSlug(s) {
  let norm = s.toLowerCase();
  norm = norm.replace(/^post:/, '');
  norm = norm.replace(/^\d{6,8}/, '');
  norm = norm.replace(/-post-on-\d{8}$/, '');
  norm = norm.replace(/-$/, ''); // clean trailing hyphen if any
  return norm;
}

async function debugUserBehaviorContentIds() {
  try {
    console.log('🔍 Debugging UserBehavior table contentIds...');
    
    const client = new DynamoDBClient(getDynamoDBConfig());
    const doc = DynamoDBDocumentClient.from(client);

    // Get recent records to see contentId patterns
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(); // Last 7 days
    
    const resp = await doc.send(new ScanCommand({
      TableName: 'UserBehavior',
      FilterExpression: '#ts >= :since',
      ExpressionAttributeNames: { '#ts': 'timestamp', '#action': 'action' },
      ExpressionAttributeValues: { ':since': sinceIso },
      ProjectionExpression: 'contentId, contentType, #action',
      Limit: 50 // Just get a sample
    }));

    const items = resp.Items || [];
    console.log(`📊 Found ${items.length} recent UserBehavior records`);
    
    // Group by contentId patterns
    const contentIdPatterns = new Map();
    const slugMappings = new Map();
    
    for (const item of items) {
      const contentId = item.contentId || '';
      const contentType = item.contentType || '';
      const action = item.action || '';
      
      if (contentType === 'post' && action === 'view') {
        // Track original contentId
        const count = contentIdPatterns.get(contentId) || 0;
        contentIdPatterns.set(contentId, count + 1);
        
        // Track normalized slug
        const normalizedSlug = normalizeSlug(contentId);
        if (normalizedSlug) {
          const slugCount = slugMappings.get(normalizedSlug) || { original: contentId, count: 0 };
          slugMappings.set(normalizedSlug, { original: contentId, count: slugCount.count + 1 });
        }
      }
    }
    
    console.log('\n📋 ContentId Patterns (top 10):');
    const sortedPatterns = Array.from(contentIdPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    for (const [contentId, count] of sortedPatterns) {
      const normalized = normalizeSlug(contentId);
      console.log(`  "${contentId}" -> "${normalized}" (${count} views)`);
    }
    
    console.log('\n🎯 Normalized Slug Mappings (top 10):');
    const sortedSlugs = Array.from(slugMappings.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
      
    for (const [slug, data] of sortedSlugs) {
      console.log(`  Slug: "${slug}" <- "${data.original}" (${data.count} views)`);
    }
    
    // Now check what popular posts are looking for
    console.log('\n🔍 Checking popular posts slugs...');
    
    // Simulate what getPopularPosts does
    const region = process.env.AWS_REGION || 'ap-east-1';
    const bucket = process.env.NEXT_PUBLIC_S3_BUCKET || process.env.S3_BUCKET_NAME || 'itsquareupdatedcontent';
    
    // Get a few recent posts
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const indexKey = `content/metadata/posts-${yyyy}-${mm}.json`;
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${indexKey}`;
      
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json) ? json : (json?.items || json?.keys || []);
          
          console.log(`\n📅 ${yyyy}-${mm} posts (first 5):`);
          for (const item of items.slice(0, 5)) {
            const key = typeof item === 'string' ? item : item?.key;
            if (key && key.endsWith('.md')) {
              const slug = key.split('/').pop()?.replace(/\.md$/, '').trim() || '';
              const hasData = slugMappings.has(slug.toLowerCase());
              console.log(`  Post slug: "${slug}" ${hasData ? '✅ HAS DATA' : '❌ NO DATA'}`);
              
              if (!hasData) {
                // Check if there's a similar contentId in the table
                for (const [contentId] of contentIdPatterns.entries()) {
                  if (contentId.includes(slug) || slug.includes(contentId.replace(/^post:/, ''))) {
                    console.log(`    🔗 Possible match: "${contentId}"`);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ Failed to fetch ${indexKey}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging UserBehavior:', error);
  }
}

// Run the debug
debugUserBehaviorContentIds().then(() => {
  console.log('\n✅ Debug complete');
}).catch(console.error);