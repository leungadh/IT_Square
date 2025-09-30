const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const lunr = require('lunr');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
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
  const words = str.split(/[\s\u3000-\u303f\uff00-\uffef\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]+/);
  
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

async function getObjectText(key) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return await obj.Body.transformToString();
  } catch (error) {
    console.warn(`Failed to get object ${key}:`, error.message);
    return null;
  }
}

exports.handler = async (event) => {
  console.log('Scheduled Lunr index rebuild triggered');
  
  try {
    // Get all post keys
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
    
    await buildSearchIndex(keys);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Lunr search index rebuilt successfully',
        documentsProcessed: keys.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error rebuilding Lunr index:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

async function buildSearchIndex(keys) {
  console.log('Building search index...');
  
  const docs = [];
  
  for (const key of keys) { // No limit for scheduled run
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