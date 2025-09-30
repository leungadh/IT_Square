#!/usr/bin/env node
/**
 * Manual script to rebuild all search indexes
 * Run this to rebuild indexes for existing S3 content
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';

const s3 = new S3Client({ region: REGION });

async function getObjectText(key) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return await obj.Body.transformToString();
  } catch (error) {
    console.warn(`Failed to get object ${key}:`, error.message);
    return null;
  }
}

function safeIso(dateStr, fallback) {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

function deriveYyyyMmFromKey(key, fmDateIso) {
  // Prefer frontmatter date
  if (fmDateIso) {
    const d = new Date(fmDateIso);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  
  // Fallback to path content/posts/YYYY/MM/...
  const m = key.match(/content\/posts\/(20\d{2})\/(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}`;
  
  // Fallback to filename slug 20250101-...
  const base = key.split('/').pop() || '';
  const m2 = base.match(/(20\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  
  // Default to current month
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function main() {
  console.log('🔄 Rebuilding search indexes...');
  console.log({ REGION, BUCKET, POSTS_PREFIX, META_PREFIX });

  try {
    // Get all post files from S3
    console.log('📂 Scanning S3 for post files...');
    let ContinuationToken = undefined;
    const keys = [];
    
    do {
      const resp = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: POSTS_PREFIX,
        ContinuationToken,
        MaxKeys: 1000,
      }));
      
      for (const obj of resp.Contents || []) {
        if (obj.Key && obj.Key.endsWith('.md')) {
          keys.push(obj.Key);
        }
      }
      
      ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (ContinuationToken);

    console.log(`📄 Found ${keys.length} post files`);
    
    if (keys.length === 0) {
      console.log('⚠️  No posts found. Make sure content exists in S3 at:', `${BUCKET}/${POSTS_PREFIX}`);
      return;
    }

    // Show sample of found files
    console.log('📋 Sample files found:');
    keys.slice(0, 5).forEach(key => console.log(`   ${key}`));
    if (keys.length > 5) console.log(`   ... and ${keys.length - 5} more`);

    // Build monthly groupings
    console.log('🗂️  Processing posts and grouping by month...');
    const monthly = new Map(); // yyyy-mm -> items array
    let processedCount = 0;

    for (const key of keys) {
      try {
        const raw = await getObjectText(key);
        if (!raw) {
          console.warn(`⚠️  Skipping empty file: ${key}`);
          continue;
        }
        
        const { data: fm } = matter(raw);
        const dateIso = safeIso(fm.date, undefined);
        const yyyyMm = deriveYyyyMmFromKey(key, dateIso);
        
        const item = {
          key,
          title: fm.title || fm.meta_title || '',
          description: fm.description || fm.des || '',
          date: dateIso || null,
          image: typeof fm.image === 'string' ? fm.image.replace(/placeholder\.jpg$/i, 'placeholder.svg') : null,
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          categories: Array.isArray(fm.categories) ? fm.categories : [],
          author: fm.author || '',
        };
        
        if (!monthly.has(yyyyMm)) {
          monthly.set(yyyyMm, []);
        }
        monthly.get(yyyyMm).push(item);
        processedCount++;
        
        // Show progress
        if (processedCount % 50 === 0) {
          console.log(`   Processed ${processedCount}/${keys.length} files...`);
        }
        
      } catch (e) {
        console.warn(`❌ Error processing ${key}:`, e.message);
      }
    }

    console.log(`✅ Processed ${processedCount} posts into ${monthly.size} monthly groups`);

    // Show monthly breakdown
    console.log('📊 Monthly breakdown:');
    for (const [yyyyMm, items] of monthly.entries()) {
      console.log(`   ${yyyyMm}: ${items.length} posts`);
    }

    // Upload each monthly index
    console.log('⬆️  Uploading monthly indexes to S3...');
    const uploadResults = [];
    
    for (const [yyyyMm, items] of monthly.entries()) {
      try {
        // Sort newest first by date
        items.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        });
        
        const body = JSON.stringify({ items }, null, 2);
        const indexKey = `${META_PREFIX}posts-${yyyyMm}.json`;
        
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: indexKey,
          Body: body,
          ContentType: 'application/json; charset=utf-8',
          // ACL: 'public-read', // Removed - bucket doesn't allow ACLs
          CacheControl: 'max-age=300, s-maxage=300', // 5 minute cache
        }));
        
        console.log(`   ✅ ${indexKey} (${items.length} items)`);
        uploadResults.push({ month: yyyyMm, items: items.length, key: indexKey });
        
      } catch (error) {
        console.error(`   ❌ Failed to upload ${yyyyMm}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully rebuilt ${uploadResults.length} search indexes!`);
    console.log('\n📍 Index URLs (publicly accessible):');
    uploadResults.forEach(result => {
      const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${result.key}`;
      console.log(`   ${result.month}: ${url}`);
    });
    
    console.log('\n✨ Search functionality should now work with all archive content!');
    
  } catch (error) {
    console.error('❌ Failed to rebuild indexes:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
