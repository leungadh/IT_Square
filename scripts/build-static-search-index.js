#!/usr/bin/env node
/*
  Build a static Lunr (CJK) search index from Markdown in S3.

  Outputs:
    - content/search/search-index.json   (lunr serialized index)
    - content/search/search-docs.json    (ref -> doc metadata)

  Env:
    AWS_REGION=ap-east-1
    S3_BUCKET_NAME=itsquareupdatedcontent
    POSTS_PREFIX=content/posts/
    SEARCH_PREFIX=content/search/
*/

const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const matter = require('gray-matter');
const { unified } = require('unified');
const remarkParse = require('remark-parse').default || require('remark-parse');
const remarkStringify = require('remark-stringify').default || require('remark-stringify');
const strip = require('strip-markdown').default || require('strip-markdown');
const glob = require('glob');
const lunr = require('lunr');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'itsquareupdatedcontent';
const POSTS_PREFIX = process.env.POSTS_PREFIX || 'content/posts/';
const SEARCH_PREFIX = process.env.SEARCH_PREFIX || 'content/search/';

let lunrLoaded = false;

function loadLunrPlugins() {
  if (!lunrLoaded) {
    require('lunr-languages/lunr.stemmer.support')(lunr);
    require('lunr-languages/tinyseg')(lunr);
    require('lunr-languages/lunr.zh')(lunr);
    lunrLoaded = true;
  }
}

loadLunrPlugins();

const s3 = new S3Client({ region: REGION });

async function getObjectText(key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return await obj.Body.transformToString();
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
  const file = await unified()
    .use(remarkParse)
    .use(strip)
    .use(remarkStringify)
    .process(markdown);
  return String(file).replace(/\s+/g, ' ').trim();
}

function toExcerpt(text, maxLen = 160) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}

async function build() {
  console.log('Building static Lunr CJK index from S3 markdown...', { REGION, BUCKET, POSTS_PREFIX });
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
      // Normalize mixed CJK-Latin boundaries to help tokenization later
      const body = (await markdownToText(content || ''))
        // eslint-disable-next-line no-useless-escape
        .replace(/([\u4e00-\u9fffA-Za-z0-9])(\(|\)|\[|\]|\{|\}|\-|\+|\.|,|:|;|!|\?|\/)/g, '$1 $2 ')
        // eslint-disable-next-line no-useless-escape
        .replace(/([\(|\)|\[|\]|\{|\}|\-|\+|\.|,|:|;|!|\?|\/])([\u4e00-\u9fffA-Za-z0-9])/g, '$1 $2')
        .replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2')
        .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2');
      const slug = key.replace(/^content\/posts\//, '').replace(/\.md$/, '');

      docs.push({
        id: slug,
        title,
        body,
        tags: (tags || []).join(' ').replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2'),
        categories: (categories || []).join(' ').replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2'),
        date,
        author,
        key,
      });
    } catch (e) {
      console.warn('Skip due to error:', key, e?.message);
    }
  }

  console.log('🔥 UPDATED: Indexing with lunr zh tokenizer...');
  const idx = lunr(function () {
    this.use(lunr.zh);
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
    tags: (d.tags || '').split(' ').filter(Boolean),
    categories: (d.categories || '').split(' ').filter(Boolean),
    author: d.author || '',
    key: d.key,
  }));
  const docsJson = JSON.stringify({ docs: docMap });

  console.log('Uploading search index artifacts to S3 with compression...');
  
  // Compress the JSON data
  const zlib = require('zlib');
  const compressedIndex = zlib.gzipSync(indexJson);
  const compressedDocs = zlib.gzipSync(docsJson);
  
  console.log(`Index size: ${indexJson.length} bytes → ${compressedIndex.length} bytes (${Math.round((1 - compressedIndex.length/indexJson.length) * 100)}% reduction)`);
  console.log(`Docs size: ${docsJson.length} bytes → ${compressedDocs.length} bytes (${Math.round((1 - compressedDocs.length/docsJson.length) * 100)}% reduction)`);
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${SEARCH_PREFIX}search-index.json`,
    Body: compressedIndex,
    ContentType: 'application/json; charset=utf-8',
    ContentEncoding: 'gzip',
    CacheControl: 'public, max-age=3600, s-maxage=7200',
    Metadata: {
      'original-size': indexJson.length.toString(),
      'compressed-size': compressedIndex.length.toString()
    }
  }));
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${SEARCH_PREFIX}search-docs.json`,
    Body: compressedDocs,
    ContentType: 'application/json; charset=utf-8',
    ContentEncoding: 'gzip',
    CacheControl: 'public, max-age=3600, s-maxage=7200',
    Metadata: {
      'original-size': docsJson.length.toString(),
      'compressed-size': compressedDocs.length.toString()
    }
  }));

  console.log('Done: wrote', `${SEARCH_PREFIX}search-index.json`, 'and', `${SEARCH_PREFIX}search-docs.json`);

  // Also write to local public/ so the app can serve without S3 credentials
  try {
    const outDir = path.join(process.cwd(), 'public', 'content', 'search');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'search-index.json'), indexJson);
    fs.writeFileSync(path.join(outDir, 'search-docs.json'), docsJson);
    console.log('Also wrote local copies to public/content/search/');
  } catch (e) {
    console.warn('Failed writing local public copies:', e?.message);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
