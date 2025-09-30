// Simulate the exact flow in the article page component
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Simulate the post data as it would be received from the posts API
const postData = {
  slug: "20250820polyusaif",
  frontmatter: {
    title: "滬港青年創新創業交流啟動 理大與高金攜手培育未來領袖",
    date: "2025-08-20T00:00:00.000Z",
    description: "香港理工大學與上海高級金融學院合作，推動滬港青年學生創新創業交流，聚焦金融與科技跨學科發展。",
    author: "Sharon Suen",
    image: "https://itsquareupdatedcontent.s3.ap-east-1.amazonaws.com/static/images/blog/2025/08/20250820polyusaif1.webp",
    tags: ["創新創業", "金融科技", "青年交流"],
    categories: ["AI/人工智能", "數碼轉型", "香港創科"]
  },
  content: `
近年來，隨著國家「十四五」規劃提出深化滬港合作，兩地在人才培育和創新創業領域的合作愈發緊密。近日，香港理工大學（[理大](https://www.polyu.edu.hk)）與上海高級金融學院（[高金](https://www.saif.sjtu.edu.cn)）香港基金會攜手推出「滬港青年成長營」，為兩地青年搭建了一個跨地域學習與交流的平台。活動吸引了逾40名來自內地及海外知名大學的青年代表參與，並以「金融與科技」及「創新與創業」為核心主題，激發青年在新時代的發展潛能。

<figure style="float: right; margin-left: 1em; margin-bottom: 1em;">
<img src="/images/blog/2025/08/20250820polyusaif2.webp" alt="理大副校長（研究及創新）趙汝恒教授於結業禮上致辭。" />
<figcaption>理大副校長趙汝恒教授與參與「滬港青年成長營」的學生合照。</figcaption>
</figure>

### 多元課程設計 助力青年成長

本次成長營於2025年8月3日至9日在上海舉行，課程內容涵蓋專題講座、企業參訪、案例研討等多種形式。課題設計聚焦於中國資本市場的發展脈絡（包括資本市場的歷史和現狀）、金融如何賦能科技創新、以及人工智能（<span style="font-family: sans-serif; color: #0000FF;" title="人工智能是模擬人類智能的技術，包括機器學習、自然語言處理等應用。">AI</span>）前沿動態等議題。主辦方期望透過理論與實踐並重的教學方式，結合實地參觀與頭部企業互動，培養學員的跨學科思維，並提升其創新創業能力。
`
};

console.log('=== Full Article Page Component Flow Simulation ===');

// Simulate the exact processing that happens in the article page component
function rewriteDevImages(html) {
  return html;
}

function extractFirstImageFromHtml(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  const rel = html.match(new RegExp("src=\"\/?(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/\\d{2}\/[^\"]+)\"", "i"));
  if (rel && rel[1]) return `https://${bucket}.s3.${region}.amazonaws.com/static/${rel[1]}`;
  const abs = html.match(new RegExp("src=\"https?:\/\/[^\"]+\/static\/(images\/blog\/[0-9]{4}\/\\d{2}\/[^\"]+)\"", "i"));
  if (abs && abs[1]) return `https://${bucket}.s3.${region}.amazonaws.com/static/${abs[1]}`;
  return null;
}

function rewriteContentImagesToS3Static(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  
  function map(url) {
    if (!url) return url;
    // eslint-disable-next-line no-useless-escape
    if (new RegExp("^https?:\/\/[^\/]+\\.s3\\.[^\/]+\\.amazonaws\\.com\/static\/images\/blog\/", "i").test(url)) return url;
    // eslint-disable-next-line no-useless-escape
    const relMatch = url.replace(/^\//, '').match(new RegExp("^(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$", "i"));
    if (relMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${relMatch[1]}`;
    }
    // eslint-disable-next-line no-useless-escape
    const siteAbsMatch = url.match(new RegExp("^https?:\/\/[^\/]+\/(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$", "i"));
    if (siteAbsMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${siteAbsMatch[1]}`;
    }
    return url;
  }
  
  return html.replace(new RegExp("src\\s*=\\s*([\"'])([^\"']+)\\1", "gi"), (_m, quote, url) => `src=${quote}${map(url)}${quote}`);
}

function rewriteHeroImage(src) {
  if (!src || src.startsWith('http')) return src;
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  const cleanSrc = src.replace(new RegExp("^\/?"), '');
  const normalized = cleanSrc.replace(new RegExp("^(?:static\/)?(?:content\/)?"), '');
  return `https://${bucket}.s3.${region}.amazonaws.com/static/${normalized}`;
}

console.log('1. Starting with post data from posts API');
console.log('   Content length:', postData.content.length);

console.log('\n2. Rendering markdown to HTML');
const rendered = md.render(postData.content || '');
console.log('   Rendered HTML length:', rendered.length);

console.log('\n3. Applying rewriteDevImages');
const afterRewriteDev = rewriteDevImages(rendered);
console.log('   Length after rewriteDevImages:', afterRewriteDev.length);

console.log('\n4. Applying rewriteContentImagesToS3Static');
const html = rewriteContentImagesToS3Static(afterRewriteDev);
console.log('   Final HTML length:', html.length);

// Check if content images were converted
const hasS3ContentImages = html.includes('itsquareupdatedcontent.s3.ap-east-1.amazonaws.com') && 
                          html.includes('20250820polyusaif2.webp');
console.log('\n5. Content image conversion check:');
console.log('   Has S3 content images:', hasS3ContentImages);

// Check hero image processing
console.log('\n6. Hero image processing:');
const currentImg = (postData.frontmatter?.image || '').trim();
console.log('   Original hero image:', currentImg);
const derived = extractFirstImageFromHtml(html);
console.log('   Derived hero image:', derived);
const heroImage = derived || rewriteHeroImage(currentImg) || '/placeholder.svg';
console.log('   Final hero image:', heroImage);

console.log('\n=== Results ===');
if (hasS3ContentImages) {
  console.log('✅ Content images successfully converted to S3 URLs');
} else {
  console.log('❌ Content images were NOT converted to S3 URLs');
}

// Show sample of converted content
console.log('\n=== Sample of converted content ===');
const lines = html.split('\n');
let foundImages = 0;
for (let i = 0; i < lines.length && foundImages < 3; i++) {
  if (lines[i].includes('src=') && lines[i].includes('itsquareupdatedcontent')) {
    console.log(lines[i].trim());
    foundImages++;
  }
}

// Test if the regex would match the actual content
console.log('\n=== Debugging actual content regex matching ===');
const testContent = `<img src="/images/blog/2025/08/20250820polyusaif2.webp"`;
const testMatch = testContent.match(/src\s*=\s*([\"'])([^\"']+)\1/);
console.log('Test content:', testContent);
console.log('Regex match result:', testMatch);
