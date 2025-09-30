const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const { execSync } = require('child_process');
const path = require('path');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';

const s3 = new S3Client({ region: REGION });

/**
 * Lambda function to automatically rebuild search indexes when S3 content changes
 * Triggered by S3 ObjectCreated/ObjectRemoved events for content/posts/** objects
 */
exports.handler = async (event) => {
  console.log('S3 Indexing Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Filter for relevant post content changes
    const relevantEvents = event.Records.filter(record => {
      const objectKey = record.s3.object.key;
      const eventOk = ['ObjectCreated', 'ObjectRemoved'].some(prefix => 
        record.eventName.startsWith(prefix)
      );
      const keyOk = objectKey.startsWith(POSTS_PREFIX) && objectKey.endsWith('.md');
      return eventOk && keyOk;
    });

    if (relevantEvents.length === 0) {
      console.log('No relevant post content changes detected');
      return { statusCode: 200, body: 'No relevant changes' };
    }

    console.log(`Processing ${relevantEvents.length} post content changes`);
    
    // Rebuild all monthly indexes
    await rebuildAllIndexes();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Search indexes rebuilt successfully',
        eventsProcessed: relevantEvents.length,
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    console.error('Error rebuilding search indexes:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

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

async function rebuildAllIndexes() {
  console.log('Starting index rebuild', { REGION, BUCKET, POSTS_PREFIX, META_PREFIX });

  // Get all post files from S3
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

  console.log(`Found ${keys.length} post files`);

  // Build monthly groupings
  const monthly = new Map(); // yyyy-mm -> items array

  for (const key of keys) {
    try {
      const raw = await getObjectText(key);
      if (!raw) continue;
      
      const { data: fm } = matter(raw);
      const dateIso = safeIso(fm.date, undefined);
      const yyyyMm = deriveYyyyMmFromKey(key, dateIso);
      
      const item = {
        key,
        title: fm.title || fm.meta_title || '',
        description: fm.description || fm.des || '',
        date: dateIso || null,
        image: typeof fm.image === 'string' ? fm.image : null,
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        categories: Array.isArray(fm.categories) ? fm.categories : [],
        author: fm.author || '',
      };
      
      if (!monthly.has(yyyyMm)) {
        monthly.set(yyyyMm, []);
      }
      monthly.get(yyyyMm).push(item);
      
    } catch (e) {
      console.warn('Skipping key due to error:', key, e?.message);
    }
  }

  // Upload each monthly index
  const uploadPromises = [];
  
  for (const [yyyyMm, items] of monthly.entries()) {
    // Sort newest first by date
    items.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
    
    const body = JSON.stringify({ items }, null, 2);
    const indexKey = `${META_PREFIX}posts-${yyyyMm}.json`;
    
    const uploadPromise = s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: indexKey,
      Body: body,
      ContentType: 'application/json; charset=utf-8',
      // ACL: 'public-read', // Removed - bucket doesn't allow ACLs
      CacheControl: 'max-age=300, s-maxage=300', // 5 minute cache
    })).then(() => {
      console.log('Wrote index:', indexKey, `(${items.length} items)`);
    }).catch(error => {
      console.error('Failed to write index:', indexKey, error.message);
    });
    
    uploadPromises.push(uploadPromise);
  }

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);
  
  console.log(`Rebuilt ${monthly.size} monthly indexes`);
  
  // Rebuild static search index
  console.log('Rebuilding static search index...');
  await rebuildStaticSearchIndex();
  
  console.log('All indexes rebuilt successfully');
}

async function rebuildStaticSearchIndex() {
  console.log('Starting static search index rebuild...');
  
  try {
    // Use the same build script we use locally
    // This will run the static index build and upload to S3
    const scriptPath = path.join(__dirname, '..', 'scripts', 'build-static-search-index.js');
    
    // Execute the build script
    const output = execSync(`NODE_OPTIONS="-r module-alias/register" node ${scriptPath}`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('Static search index rebuilt successfully');
    return true;
  } catch (error) {
    console.error('Failed to rebuild static search index:', error);
    throw error;
  }
}
