// Test direct S3 fetch for nmpa article
const https = require('https');

const url = 'https://itsquareupdatedcontent.s3.ap-east-1.amazonaws.com/content/posts/2025/08/nmpa.md';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Content length:', data.length);
    console.log('First 200 chars:', data.substring(0, 200));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});