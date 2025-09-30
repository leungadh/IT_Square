const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const lunr = require('lunr');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';
const SEARCH_PREFIX = process.env.SEARCH_PREFIX || 'content/search/';

const s3 = new S3Client({ region: REGION });

// Simple Chinese text tokenizer without native dependencies
function simpleChineseTokenizer(obj) {
  if (obj == null || obj == undefined) return [];
  if (Array.isArray(obj)) {
    return obj.map(function (t) {
      return new lunr.Token(lunr.utils.asString(t).toLowerCase());
    });
  }
  
  const str = lunr.utils.asString(obj);
  const tokens = [];
  
  // Split on whitespace and punctuation
  const words = str.split(/[\s\u3000-\u303f\uff00-\uffef\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,\-. /:;<=>?@[\]^_`{|}~]+/);
  
  for (const word of words) {
    if (word.length === 0) continue;
    
    // For Chinese characters, split into individual characters and bigrams
    if (/[\u4e00-\u9fff]/.test(word)) {
      // Add individual characters
      for (let i = 0; i < word.length; i++) {
        if (/[\u4e00-\u9fff]/.test(word[i])) {
          tokens.push(word[i]);
        }
      }
      // Add bigrams for better search
      for (let i = 0; i < word.length - 1; i++) {
        if (/[\u4e00-\u9fff]/.test(word[i]) && /[\u4e00-\u9fff]/.test(word[i + 1])) {
          tokens.push(word[i] + word[i + 1]);
        }
      }
    } else {
      // For non-Chinese text, add as-is
      tokens.push(word.toLowerCase());
    }
  }
  
  return tokens.map(t => new lunr.Token(t, {}));
}

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
    
    // Rebuild monthly indexes only
    await rebuildMonthlyIndexes();
    
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
        stack: error.stack,
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
  if (fmDateIso) {
    const d = new Date(fmDateIso);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  
  const m = key.match(/content\/posts\/(20\d{2})\/(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}`;
  
  const base = key.split('/').pop() || '';
  const m2 = base.match(/(20\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function rebuildMonthlyIndexes() {
  console.log('Starting monthly indexes rebuild', { REGION, BUCKET, POSTS_PREFIX, META_PREFIX });

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
  const monthly = new Map();

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
      CacheControl: 'max-age=300, s-maxage=300',
    })).then(() => {
      console.log('Wrote index:', indexKey, `(${items.length} items)`);
    }).catch(error => {
      console.error('Failed to write index:', indexKey, error.message);
    });
    
    uploadPromises.push(uploadPromise);
  }

  await Promise.all(uploadPromises);
  console.log(`Rebuilt ${monthly.size} monthly indexes`);
}

async function rebuildAllIndexes() {
  await rebuildMonthlyIndexes();
  // For full rebuild if needed, but skipping search index as per update
  console.log('Full rebuild completed (monthly only)');
}

async function buildSearchIndex(keys) {
  console.log('Building search index...');
  
  const docs = [];
  
  for (const key of keys.slice(0, 500)) { // Limit to prevent timeout
    try {
      const raw = await getObjectText(key);
      if (!raw) continue;
      
      const { data: fm, content } = matter(raw);
      
      // Simple markdown to text conversion
      const plainText = content
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]*`/g, '') // Remove inline code
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Convert links to text
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Remove emphasis
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      const slug = key.replace(/^content\/posts\//, '').replace(/\.md$/, '');
      
      docs.push({
        id: slug,
        title: fm.title || fm.meta_title || '',
        body: plainText,
        tags: Array.isArray(fm.tags) ? fm.tags.join(' ') : '',
        categories: Array.isArray(fm.categories) ? fm.categories.join(' ') : '',
        date: fm.date || null,
        author: fm.author || '',
        key,
      });
      
    } catch (e) {
      console.warn('Skip due to error:', key, e?.message);
    }
  }
  
  console.log(`Building index for ${docs.length} documents`);
  
  // Build Lunr index with Chinese support
  const idx = lunr(function () {
    this.tokenizer = simpleChineseTokenizer;
    this.ref('id');
    this.field('title', { boost: 5 });
    this.field('body');
    this.field('tags', { boost: 3 });
    this.field('categories');
    this.metadataWhitelist = ['position'];
    
    docs.forEach((d) => this.add(d));
  });
  
  const indexJson = JSON.stringify(idx.toJSON());
  
  const docMap = docs.map((d) => ({
    id: d.id,
    slug: d.id,
    title: d.title || 'Untitled',
    date: d.date || null,
    excerpt: d.body.slice(0, 160) + (d.body.length > 160 ? '…' : ''),
    tags: d.tags.split(' ').filter(Boolean),
    categories: d.categories.split(' ').filter(Boolean),
    author: d.author || '',
    key: d.key,
  }));
  
  const docsJson = JSON.stringify({ docs: docMap });
  
  // Upload search files
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${SEARCH_PREFIX}search-index.json`,
      Body: indexJson,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'public, max-age=300',
    })),
    s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${SEARCH_PREFIX}search-docs.json`,
      Body: docsJson,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'public, max-age=300',
    }))
  ]);
  
  console.log('Search index files uploaded successfully');
}