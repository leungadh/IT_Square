const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';

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

    // Filter for relevant post content changes for METADATA indexing only
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
      console.log(`Processing ${relevantIndexingEvents.length} post content changes for METADATA indexing only`);
      
      // Only rebuild monthly metadata indexes (fast operation)
      await rebuildMonthlyIndexes();
      indexingTriggered = true;
      
      console.log('✅ Monthly metadata indexes rebuilt successfully');
      console.log('ℹ️  Search indexes will be handled by it-square-weekly-lunr-indexer');
    }

    if (!deploymentTriggered && !indexingTriggered) {
      console.log('No relevant changes detected');
      return { statusCode: 200, body: 'No relevant changes' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Metadata indexing completed successfully',
        deploymentTriggered,
        metadataIndexingTriggered: indexingTriggered,
        note: 'Search indexes handled by separate weekly indexer',
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

async function rebuildMonthlyIndexes() {
  console.log('Starting METADATA-ONLY index rebuild');
  
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

  console.log(`Found ${keys.length} post files for monthly metadata indexing`);

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

  // Upload monthly indexes in parallel (fast operation)
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
      console.log('Wrote metadata index:', indexKey, `(${items.length} items)`);
    }).catch(error => {
      console.error('Failed to write metadata index:', indexKey, error.message);
    });
    
    uploadPromises.push(uploadPromise);
  }

  await Promise.all(uploadPromises);
  console.log(`✅ Rebuilt ${monthly.size} monthly metadata indexes (FAST)`);
  console.log('ℹ️  Search indexing will be handled by weekly Lunr indexer');
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