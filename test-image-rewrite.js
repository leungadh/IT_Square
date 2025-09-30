const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Test content from the article
const content = `
<figure style="float: right; margin-left: 1em; margin-bottom: 1em;">
<img src="/images/blog/2025/08/20250820polyusaif2.webp" alt="理大副校長（研究及創新）趙汝恒教授於結業禮上致辭。" />
<figcaption>理大副校長趙汝恒教授與參與「滬港青年成長營」的學生合照。</figcaption>
</figure>

![Alt text](/images/blog/2025/08/20250820polyusaif1.webp)
`;

const rendered = md.render(content);
console.log('Rendered HTML:');
console.log(rendered);

function rewriteContentImagesToS3Static(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  
  function map(url) {
    if (!url) return url;
    console.log('Processing URL:', url);
    // Already absolute S3 URL
    // eslint-disable-next-line no-useless-escape
    if (/^https?:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/static\/images\/blog\//i.test(url)) return url;
    // Handle relative paths like /images/blog/2025/08/...
    const relMatch = url.replace(/^\//, '').match(/^(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (relMatch) {
      console.log('Relative match found:', relMatch[1]);
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${relMatch[1]}`;
    }
    // Handle absolute paths from same domain
    // eslint-disable-next-line no-useless-escape
    const siteAbsMatch = url.match(/^https?:\/\/[^\/]+\/(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (siteAbsMatch) {
      console.log('Site absolute match found:', siteAbsMatch[1]);
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${siteAbsMatch[1]}`;
    }
    console.log('No match, returning original:', url);
    return url;
  }
  
  // More robust regex that handles various whitespace and quote patterns
  return html.replace(/src\s*=\s*(["'])([^"']+)\1/gi, (_m, quote, url) => {
    console.log('Regex match:', { quote, url });
    return `src=${quote}${map(url)}${quote}`;
  });
}

const rewritten = rewriteContentImagesToS3Static(rendered);
console.log('\nRewritten HTML:');
console.log(rewritten);
