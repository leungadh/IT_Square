const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const lunr = require('lunr');
const Segment = require('segment');
const seg = new Segment();
seg.useDefault();


const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';
const SEARCH_PREFIX = process.env.SEARCH_PREFIX || 'content/search/';

let lunrLoaded = false;

function loadLunrPlugins() {
  if (!lunrLoaded) {
    require('lunr-languages/lunr.stemmer.support')(lunr);
    require('lunr-languages/tinyseg')(lunr);
    lunrLoaded = true;
  }
}

loadLunrPlugins();

lunr.zhTokenizer = function (obj) {
  if (obj == null || obj == undefined) return [];
  if (Array.isArray(obj)) {
    return obj.map(function (t) {
      return new lunr.Token(lunr.utils.asString(t).toLowerCase());
    });
  }
  let tokens = [];
  const str = lunr.utils.asString(obj);
  const words = str.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/[\u4e00-\u9fff]/.test(word)) {
      const segmented = seg.doSegment(word).map(token => token.w);
      tokens = tokens.concat(segmented);
    } else {
      tokens.push(word.toLowerCase());
    }
  }
  return tokens.map(t => new lunr.Token(t, {}));
};

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
      // Count changes by type
      const changes = {
        created: relevantDeploymentEvents.filter(e => e.eventName.startsWith('ObjectCreated')).length,
        removed: relevantDeploymentEvents.filter(e => e.eventName.startsWith('ObjectRemoved')).length,
      };

      console.log(`Detected deployment changes: ${changes.created} created, ${changes.removed} removed`);

      // Get current file count for context
      const fileCount = await getContentFileCount();
      console.log(`Current content files: ${fileCount}`);

      // Trigger ECS task for incremental deployment
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
      await rebuildAllIndexes();
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

  // Include network configuration only when provided
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
  const m = key.match(/content\/posts\/(20\d{2})\/(\d{2})\/ /);
  if (m) return `${m[1]}-${m[2]}`;
  const base = key.split('/').pop() || '';
  const m2 = base.match(/(20\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function rebuildAllIndexes() {
  console.log('Starting index rebuild', { REGION, BUCKET, POSTS_PREFIX, META_PREFIX });

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
  await buildStaticSearchIndex();
  console.log('All indexes rebuilt successfully');
}

async function buildStaticSearchIndex() {
  console.log('Building static Lunr CJK index...');
  const keys = await listAllMarkdownKeys(POSTS_PREFIX);
  console.log(`Found ${keys.length} markdown files`);
  const docs = [];
  for (const key of keys) {
    try {
      const raw = await getObjectText(key);
      const { data: fm, content } = matter(raw);
      const title = (fm.title || fm.meta_title || '')
        .replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2')
        .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2');
      const date = fm.date || fm.publishedAt || null;
      const tags = Array.isArray(fm.tags) ? fm.tags : [];
      const categories = Array.isArray(fm.categories) ? fm.categories : [];
      const author = fm.author || '';
      const rawBody = await markdownToText(content || '');
      let body = rawBody;
      body = body.replace(/([\u4e00-\u9fffA-Za-z0-9])(\(|\)| \[|\]|\{|\}|\-|\+|\.|,|:|;|!|\?|\//g, '$1 $2 ');  
      body = body.replace(/(\(|\)| \[|\]|\{|\}|\-|\+|\.|,|:|;|!|\?|\//g, '$1 $2');  
      body = body.replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2');
      body = body.replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2');
      const slug = key.replace(/^content\/posts\//, '').replace(/\.md$/, '');
      docs.push({
        id: slug,
        title,
        body,
        tags: tags.join(' ').replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2'),
        categories: categories.join(' ').replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2'),
        date,
        author,
        key,
      });
    } catch (e) {
      console.warn('Skip due to error:', key, e?.message);
    }
  }
  const idx = lunr(function () {
  this.tokenizer = lunr.zhTokenizer;
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
    excerpt: toExcerpt(d.body),
    tags: d.tags.split(' ').filter(Boolean),
    categories: d.categories.split(' ').filter(Boolean),
    author: d.author || '',
    key: d.key,
  }));
  const docsJson = JSON.stringify({ docs: docMap });
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${SEARCH_PREFIX}search-index.json`,
    Body: indexJson,
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'public, max-age=300',
  }));
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${SEARCH_PREFIX}search-docs.json`,
    Body: docsJson,
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'public, max-age=300',
  }));
  console.log('Done: wrote search-index.json and search-docs.json');
}

async function listAllMarkdownKeys(prefix) {
  let ContinuationToken = undefined;
  const keys = [];
  do {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken,
      MaxKeys: 1000,
    }));
    for (const obj of resp.Contents || []) {
      if (obj.Key && obj.Key.endsWith('.md')) keys.push(obj.Key);
    }
    ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function markdownToText(markdown) {
  const { unified } = await import('unified');
  const remarkParse = await import('remark-parse');
  const remarkStringify = await import('remark-stringify');
  const strip = await import('strip-markdown');
  const file = await unified()
    .use(remarkParse.default)
    .use(strip.default)
    .use(remarkStringify.default)
    .process(markdown);
  return String(file).replace(/\s+/g, ' ').trim();
}

function toExcerpt(text, maxLen = 160) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}
