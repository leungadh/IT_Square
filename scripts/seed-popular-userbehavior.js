#!/usr/bin/env node
/* Seed synthetic popularity data for UserBehavior using S3 posts */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || 'itsquareupdatedcontent';
const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Get all post slugs from S3 by fetching monthly indexes
async function getAllPostSlugs() {
  const slugs = new Set(); // Use Set to avoid duplicates
  
  try {
    console.log('🔍 Fetching post indexes from S3...');
    
    // Fetch recent monthly indexes (last 12 months to cover 2025 posts)
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const indexKey = `content/metadata/posts-${year}-${month}.json`;
      
      try {
        const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${indexKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data) ? data : (data.items || data.keys || []);
          
          for (const item of items) {
            const key = typeof item === 'string' ? item : (item.key || '');
            if (key && key.endsWith('.md')) {
              const slug = key.split('/').pop().replace(/\.md$/, '');
              slugs.add(slug);
            }
          }
          
          console.log(`📝 Found ${items.length} posts in ${year}-${month} index`);
        }
      } catch (error) {
        // Index might not exist, that's okay
        console.log(`ℹ️  No index found for ${year}-${month}`);
      }
    }
    
    const slugArray = Array.from(slugs);
    console.log(`📊 Total unique posts found: ${slugArray.length}`);
    return slugArray;
    
  } catch (error) {
    console.error('❌ Error fetching post indexes from S3:', error);
    return [];
  }
}

// Generate realistic user behavior patterns
function generateUserBehavior(slugs) {
  const behaviors = [];
  const now = new Date();
  
  // Generate data for the last 30 days
  for (let day = 0; day < 30; day++) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    
    // Simulate different popularity levels for different posts
    slugs.forEach((slug, index) => {
      // Some posts are more popular than others
      const basePopularity = Math.max(1, Math.floor(Math.random() * 10) + (index % 3 === 0 ? 15 : 5));
      const dailyViews = Math.floor(basePopularity * (0.8 + Math.random() * 0.4)); // ±20% variation
      
      // Generate individual view events
      for (let view = 0; view < dailyViews; view++) {
        const sessionId = `sess_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString();
        const dwellTime = Math.floor(Math.random() * 300 + 30); // 30-330 seconds
        
        behaviors.push({
          sessionId,
          timestamp,
          contentId: slug,
          contentType: 'post',
          action: 'view',
          dwellTimeSeconds: dwellTime,
          userId: `user_${Math.random().toString(36).substr(2, 8)}`,
          referrer: Math.random() > 0.7 ? 'search' : 'direct',
          deviceType: Math.random() > 0.6 ? 'mobile' : 'desktop'
        });
        
        // Sometimes users click on related articles
        if (Math.random() > 0.85) {
          behaviors.push({
            sessionId,
            timestamp: new Date(new Date(timestamp).getTime() + dwellTime * 1000 + 1000).toISOString(),
            contentId: slug,
            contentType: 'post',
            action: 'click_related',
            relatedContentId: slugs[Math.floor(Math.random() * slugs.length)],
            userId: `user_${Math.random().toString(36).substr(2, 8)}`,
            referrer: 'internal',
            deviceType: Math.random() > 0.6 ? 'mobile' : 'desktop'
          });
        }
      }
    });
  }
  
  return behaviors;
}

// Batch write to DynamoDB
async function writeBehaviors(behaviors) {
  const BATCH_SIZE = 25; // DynamoDB batch write limit
  
  for (let i = 0; i < behaviors.length; i += BATCH_SIZE) {
    const batch = behaviors.slice(i, i + BATCH_SIZE);
    const requests = batch.map(behavior => ({
      PutRequest: { Item: behavior }
    }));
    
    try {
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          UserBehavior: requests
        }
      }));
      
      console.log(`✓ Wrote batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(behaviors.length / BATCH_SIZE)}`);
      
      // Small delay to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ Failed to write batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
    }
  }
}

async function main() {
  try {
    console.log('🔍 Fetching post slugs from S3 indexes...');
    const slugs = await getAllPostSlugs();
    console.log(`📝 Found ${slugs.length} unique posts`);
    
    if (slugs.length === 0) {
      console.error('❌ No posts found in S3 indexes');
      process.exit(1);
    }
    
    console.log('🎲 Generating synthetic user behavior data...');
    const behaviors = generateUserBehavior(slugs);
    console.log(`📊 Generated ${behaviors.length} behavior events`);
    
    console.log('💾 Writing to DynamoDB UserBehavior table...');
    await writeBehaviors(behaviors);
    
    console.log('✅ Successfully seeded UserBehavior table with synthetic data!');
    console.log(`📈 Data includes views, dwell times, and related clicks for ${slugs.length} posts over 30 days`);
    
    // Show some sample popular posts
    const postViews = {};
    behaviors.forEach(b => {
      if (b.action === 'view') {
        postViews[b.contentId] = (postViews[b.contentId] || 0) + 1;
      }
    });
    
    const topPosts = Object.entries(postViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    console.log('\n🏆 Top 5 most popular posts:');
    topPosts.forEach(([slug, views], index) => {
      console.log(`${index + 1}. ${slug}: ${views} views`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
