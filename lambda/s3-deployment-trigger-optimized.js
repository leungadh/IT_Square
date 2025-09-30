const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const lunr = require('lunr');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';
const SEARCH_PREFIX = process.env.SEARCH_PREFIX || 'content/search/';

// Optimized Chinese tokenizer
function simpleChineseTokenizer(obj) {
  if (obj == null || obj == undefined) return [];
  if (Array.isArray(obj)) {
    return obj.map(function (t) {
      return new lunr.Token(lunr.utils.asString(t).toLowerCase());
    });
  }
  
  const str = lunr.utils.asString(obj);
  const tokens = [];
  const words = str.split(/[\s\u3000-\u303f\uff00-\uffef\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]+/);
  
  for (const word of words) {
    if (word.length === 0) continue;
    
    if (/[\u4e00-\u9fff]/.test(word)) {
      // For Chinese: individual characters + bigrams
      for (let i = 0; i < word.length; i++) {
        if (/[\u4e00-\u9fff]/.test(word[i])) {
          tokens.push(word[i]);
        }
      }
      for (let i = 0; i < word.length - 1; i++) {
        if (/[\u4e00-\u9fff]/.test(word[i]) && /[\u4e00-\u9fff]/.test(word[i + 1])) {
          tokens.push(word[i] + word[i + 1]);
        }
      }
    } else {
      tokens.push(word.toLowerCase());
    }
  }
  
  return tokens.map(t => new lunr.Token(t, {}));
}

const ecs = new ECSClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

exports.handler = async (event) => {
  console.log('S3 Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Filter relevant S3 events for deployment
    const bucketFilter = process.env.S3_BUCKET;
    const relevantDeploymentEvents = event.Records.filter(record => {
      const bucketName = record.s3.bucket.name;
      const objectKey = record.s3.object.key;
      const eventOk = ['ObjectCreated', 'ObjectRemoved'].some(prefix => record.eventName.startsWith(prefix));
      const keyOk = objectKey.startsWith('content/');
      const bucketOk = !bucketFilter || bucketName === bucketFilter;
      return eventOk && keyOk && bucketOk;
    });

    let deploymentTriggered = false;
    if (relevantDeploymentEvents.length > 0) {
      const changes = {
        created: relevantDeploymentEvents.filter(e => e.eventName.startsWith('ObjectCreated')).length,
        removed: relevantDeploymentEvents.filter(e => e.eventName.startsWith('ObjectRemoved')).length,
      };

      console.log(`Detected deployment changes: ${changes.created} created, ${changes.removed} removed`);
      const fileCount = await getContentFileCount();
      console.log(`Current content files: ${fileCount}`);

      await triggerDeployment(changes, fileCount);
      deploymentTriggered = true;
    }

    // Filter for relevant post content changes for indexing
    const relevantIndexingEvents = event.Records.filter(record => {
      const objectKey = record.s3.object.key;
      const eventOk = ['ObjectCreated', 'ObjectRemoved'].some(prefix => 
        record.eventName.startsWith(prefix)
      );
      const keyOk = objectKey.startsWith(POSTS_PREFIX) && objectKey.endsWith('.md');
      return eventOk && keyOk;
    });

    let indexingTriggered = false;
    if (relevantIndexingEvents.length > 0) {
      console.log(`Processing ${relevantIndexingEvents.length} post content changes for indexing`);
      
      // Quick indexing with timeout protection
      await rebuildIndexesWithTimeout();
      indexingTriggered = true;
    }

    if (!deploymentTriggered && !indexingTriggered) {
      console.log('No relevant changes detected');
      return { statusCode: 200, body: 'No relevant changes' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Operations completed successfully',
        deploymentTriggered,
        indexingTriggered,
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    console.error('Error processing S3 event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

async function getContentFileCount() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'content/',
      MaxKeys: 1000,
    });
    const response = await s3.send(command);
    return response.KeyCount || 0;
  } catch (error) {
    console.error('Error counting S3 objects:', error);
    return 0;
  }
}

async function triggerDeployment(changes, fileCount) {
  const cluster = process.env.ECS_CLUSTER || process.env.ECS_CLUSTER_NAME;
  const taskDefinition = process.env.ECS_TASK_DEFINITION || process.env.ECS_TASK || process.env.ECS_TASK_DEFINITION_NAME;
  const subnets = (process.env.SUBNETS || '').split(',').map(s => s.trim()).filter(Boolean);
  const securityGroups = (process.env.SECURITY_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);

  const taskParams = {
    cluster,
    taskDefinition,
    launchType: 'FARGATE',
    overrides: {
      containerOverrides: [
        {
          name: 'itsquare-deployment-container',
          environment: [
            { name: 'DEPLOYMENT_TYPE', value: 'incremental' },
            { name: 'CHANGES_CREATED', value: changes.created.toString() },
            { name: 'CHANGES_REMOVED', value: changes.removed.toString() },
            { name: 'TOTAL_FILES', value: fileCount.toString() },
            { name: 'TRIGGER_SOURCE', value: 's3-event' },
          ],
        },
      ],
    },
  };

  if (subnets.length > 0 && securityGroups.length > 0) {
    taskParams.networkConfiguration = {
      awsvpcConfiguration: {
        subnets,
        securityGroups,
        assignPublicIp: 'ENABLED',
      },
    };
  }

  console.log('Triggering ECS task:', JSON.stringify(taskParams, null, 2));
  const command = new RunTaskCommand(taskParams);
  const response = await ecs.send(command);
  console.log('ECS task triggered:', response.tasks[0].taskArn);
  return response;
}

async function rebuildIndexesWithTimeout() {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 240000; // 4 minutes (leave 1 minute buffer)
  
  console.log('Starting optimized index rebuild');

  try {
    // Step 1: Rebuild monthly indexes (fast)
    await rebuildMonthlyIndexes();
    
    const elapsedTime = Date.now() - startTime;
    console.log(`Monthly indexes completed in ${elapsedTime}ms`);
    
    // Step 2: Build search index with remaining time
    const remainingTime = MAX_EXECUTION_TIME - elapsedTime;
    if (remainingTime > 30000) { // At least 30 seconds remaining
      await buildOptimizedSearchIndex(remainingTime);
    } else {
      console.log('Insufficient time for search index, triggering async rebuild');
      await triggerAsyncSearchRebuild();
    }
    
    console.log('All indexes rebuilt successfully');
  } catch (error) {
    console.error('Error in index rebuild:', error);
    // Ensure monthly indexes are available even if search fails
    throw error;
  }
}

async function rebuildMonthlyIndexes() {
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

  console.log(`Found ${keys.length} post files for monthly indexing`);

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

  // Upload monthly indexes in parallel
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

async function buildOptimizedSearchIndex(maxTime) {
  console.log(`Building search index with ${maxTime}ms available`);
  const startTime = Date.now();
  
  // Get recent posts first (last 6 months)
  const keys = await listRecentMarkdownKeys(500); // Limit to 500 most recent
  console.log(`Building search index for ${keys.length} recent posts`);
  
  const docs = [];
  
  for (const key of keys) {
    // Check time remaining
    if (Date.now() - startTime > maxTime - 10000) {
      console.log('Time limit approaching, stopping search index build');
      break;
    }
    
    try {
      const raw = await getObjectText(key);
      if (!raw) continue;
      
      const { data: fm, content } = matter(raw);
      
      // Simple markdown to text conversion
      const plainText = content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000); // Limit content length
      
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
  
  if (docs.length === 0) {
    console.log('No documents to index');
    return;
  }
  
  console.log(`Building Lunr index for ${docs.length} documents`);
  
  // Build Lunr index
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
  
  const elapsed = Date.now() - startTime;
  console.log(`Search index completed in ${elapsed}ms`);
}

async function listRecentMarkdownKeys(limit = 500) {
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
        keys.push({
          key: obj.Key,
          lastModified: obj.LastModified
        });
      }
    }
    
    ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (ContinuationToken && keys.length < limit * 2);
  
  // Sort by last modified (most recent first) and take limit
  keys.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  return keys.slice(0, limit).map(item => item.key);
}

async function triggerAsyncSearchRebuild() {
  console.log('Triggering async search index rebuild via ECS');
  // This would trigger a separate ECS task for search indexing
  // For now, just log that we need async rebuild
  console.log('TODO: Implement async search rebuild task');
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