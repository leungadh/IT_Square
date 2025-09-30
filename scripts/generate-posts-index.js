#!/usr/bin/env node
/*
  Generate monthly public JSON indexes for posts in S3.

  - Scans S3 prefix content/posts/** for .md files
  - Groups by YYYY-MM from object key path or frontmatter date
  - Writes content/metadata/posts-YYYY-MM.json with basic items
  - Sets Content-Type application/json and ACL public-read

  Env:
    AWS_REGION=ap-east-1
    S3_BUCKET_NAME=itsquareupdatedcontent
    POSTS_PREFIX=content/posts/
    METADATA_PREFIX=content/metadata/
*/

const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const META_PREFIX = process.env.METADATA_PREFIX || 'content/metadata/';

const s3 = new S3Client({ region: REGION });

async function getObjectText(key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return await obj.Body.transformToString();
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
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function run() {
  console.log('Generating posts indexes', { REGION, BUCKET, POSTS_PREFIX, META_PREFIX });

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
      if (obj.Key && obj.Key.endsWith('.md')) keys.push(obj.Key);
    }
    ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (ContinuationToken);

  console.log(`Found ${keys.length} post files`);

  // Build monthly map
  const monthly = new Map(); // yyyy-mm -> items array

  for (const key of keys) {
    try {
      const raw = await getObjectText(key);
      const { data: fm } = matter(raw);
      const dateIso = safeIso(fm.date, undefined);
      const yyyyMm = deriveYyyyMmFromKey(key, dateIso);
      const item = {
        key,
        title: fm.title || fm.meta_title || '',
        date: dateIso || null,
        image: typeof fm.image === 'string' ? fm.image : null,
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        categories: Array.isArray(fm.categories) ? fm.categories : [],
      };
      if (!monthly.has(yyyyMm)) monthly.set(yyyyMm, []);
      monthly.get(yyyyMm).push(item);
    } catch (e) {
      console.warn('Skipping key due to error:', key, e?.message);
    }
  }

  // Upload each month
  for (const [yyyyMm, items] of monthly.entries()) {
    // Sort newest first by date or key
    items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    const body = JSON.stringify({ items }, null, 2);
    const indexKey = `${META_PREFIX}posts-${yyyyMm}.json`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: indexKey,
      Body: body,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'max-age=60, s-maxage=60',
    }));
    console.log('Wrote index:', indexKey, `(${items.length} items)`);
  }

  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


