const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Simulate the raw markdown content from posts API (as we saw in the curl response)
const rawMarkdownContent = `
近年來，隨著國家「十四五」規劃提出深化滬港合作，兩地在人才培育和創新創業領域的合作愈發緊密。近日，香港理工大學（[理大](https://www.polyu.edu.hk)）與上海高級金融學院（[高金](https://www.saif.sjtu.edu.cn)）香港基金會攜手推出「滬港青年成長營」，為兩地青年搭建了一個跨地域學習與交流的平台。活動吸引了逾40名來自內地及海外知名大學的青年代表參與，並以「金融與科技」及「創新與創業」為核心主題，激發青年在新時代的發展潛能。

<figure style="float: right; margin-left: 1em; margin-bottom: 1em;">
<img src="/images/blog/2025/08/20250820polyusaif2.webp" alt="理大副校長（研究及創新）趙汝恒教授於結業禮上致辭。" />
<figcaption>理大副校長趙汝恒教授與參與「滬港青年成長營」的學生合照。</figcaption>
</figure>

### 多元課程設計 助力青年成長

本次成長營於2025年8月3日至9日在上海舉行，課程內容涵蓋專題講座、企業參訪、案例研討等多種形式。課題設計聚焦於中國資本市場的發展脈絡（包括資本市場的歷史和現狀）、金融如何賦能科技創新、以及人工智能（<span style="font-family: sans-serif; color: #0000FF;" title="人工智能是模擬人類智能的技術，包括機器學習、自然語言處理等應用。">AI</span>）前沿動態等議題。主辦方期望透過理論與實踐並重的教學方式，結合實地參觀與頭部企業互動，培養學員的跨學科思維，並提升其創新創業能力。
`;

// Simulate what happens in the article page component
function rewriteDevImages(html) {
  // No longer needed - always use S3 URLs directly
  return html;
}

function rewriteContentImagesToS3Static(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  
  function map(url) {
    if (!url) return url;
    // Already absolute S3 URL
    // eslint-disable-next-line no-useless-escape
    if (/^https?:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/static\/images\/blog\//i.test(url)) return url;
    // Handle relative paths like /images/blog/2025/08/...
    const relMatch = url.replace(/^\//, '').match(/^(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (relMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${relMatch[1]}`;
    }
    // Handle absolute paths from same domain
    // eslint-disable-next-line no-useless-escape
    const siteAbsMatch = url.match(/^https?:\/\/[^\/]+\/(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (siteAbsMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${siteAbsMatch[1]}`;
    }
    return url;
  }

  // More robust regex that handles various whitespace and quote patterns
  return html.replace(/src\s*=\s*(["'])([^"']+)\1/gi, (_m, quote, url) => `src=${quote}${map(url)}${quote}`);
}

console.log('=== Simulating Article Page Component Flow ===');
console.log('1. Raw markdown content from posts API:');
console.log('Content length:', rawMarkdownContent.length);

console.log('\n2. Rendering markdown to HTML:');
const rendered = md.render(rawMarkdownContent || '');
console.log('Rendered HTML length:', rendered.length);

console.log('\n3. Applying rewriteDevImages (should be no-op):');
const afterRewriteDev = rewriteDevImages(rendered);
console.log('Length after rewriteDevImages:', afterRewriteDev.length);

console.log('\n4. Applying rewriteContentImagesToS3Static:');
const finalHtml = rewriteContentImagesToS3Static(afterRewriteDev);
console.log('Final HTML length:', finalHtml.length);

// Check if conversion happened
if (finalHtml.includes('itsquareupdatedcontent.s3.ap-east-1.amazonaws.com')) {
  console.log('\n✅ SUCCESS: Images converted to S3 URLs');
} else {
  console.log('\n❌ FAILURE: Images NOT converted to S3 URLs');
}

// Show the converted image tag
console.log('\n=== Sample of converted content ===');
const lines = finalHtml.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('src=') && lines[i].includes('itsquareupdatedcontent')) {
    console.log('Converted image tag:');
    console.log(lines[i].trim());
    break;
  }
}

// Test the regex matching more thoroughly
console.log('\n=== Debugging regex matching ===');
const testHtml = `<img src="/images/blog/2025/08/20250820polyusaif2.webp" alt="test" />`;
console.log('Test HTML:', testHtml);

const testResult = rewriteContentImagesToS3Static(testHtml);
console.log('Result:', testResult);
