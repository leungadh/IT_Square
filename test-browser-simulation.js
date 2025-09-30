// Simulate what happens in the browser environment
// Mock fetch function
async function mockFetch(url) {
  console.log('Fetching:', url);
  
  if (url.includes('/api/posts')) {
    // Return the posts data
    const postsData = [
      {
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
      }
    ];
    
    return {
      ok: true,
      json: async () => postsData
    };
  }
  
  return {
    ok: false,
    status: 404,
    json: async () => ({ error: 'Not found' })
  };
}

// Simulate the MarkdownIt and processing functions
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

function rewriteDevImages(html) {
  return html;
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

function extractFirstImageFromHtml(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  const rel = html.match(new RegExp("src=\"\/?(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/\\d{2}\/[^\"]+)\"", "i"));
  if (rel && rel[1]) return `https://${bucket}.s3.${region}.amazonaws.com/static/${rel[1]}`;
  const abs = html.match(new RegExp("src=\"https?:\/\/[^\"]+\/static\/(images\/blog\/[0-9]{4}\/\\d{2}\/[^\"]+)\"", "i"));
  if (abs && abs[1]) return `https://${bucket}.s3.${region}.amazonaws.com/static/${abs[1]}`;
  return null;
}

function rewriteHeroImage(src) {
  if (!src || src.startsWith('http')) return src;
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  const cleanSrc = src.replace(new RegExp("^\/?"), '');
  const normalized = cleanSrc.replace(new RegExp("^(?:static\/)?(?:content\/)?"), '');
  return `https://${bucket}.s3.${region}.amazonaws.com/static/${normalized}`;
}

// Simulate the useEffect logic
async function simulateUseEffect() {
  console.log('=== Simulating useEffect logic ===');
  
  // Simulate params Promise
  const params = Promise.resolve({ slug: ['20250820polyusaif'] });
  
  try {
    console.log('1. Awaiting params...');
    const { slug } = await params;
    console.log('   Slug:', slug);
    
    const parts = Array.isArray(slug) ? slug : [String(slug || '')];
    const baseSlug = parts[parts.length - 1];
    console.log('   Base slug:', baseSlug);
    
    console.log('2. Fetching posts...');
    const response = await mockFetch(`/api/posts?limit=200`);
    console.log('   Response ok:', response.ok);
    
    if (!response.ok) throw new Error('Failed to fetch posts');
    
    const posts = await response.json();
    console.log('   Posts loaded:', posts.length);
    
    const foundPost = posts.find((p) => p.slug === baseSlug);
    console.log('   Found post:', !!foundPost);
    
    if (foundPost) {
      console.log('3. Processing found post...');
      const rendered = md.render(foundPost.content || '');
      console.log('   Rendered length:', rendered.length);
      
      const html = rewriteContentImagesToS3Static(rewriteDevImages(rendered));
      console.log('   HTML length:', html.length);
      
      const currentImg = (foundPost.frontmatter?.image || '').trim();
      console.log('   Current image:', currentImg);
      
      const derived = extractFirstImageFromHtml(html);
      console.log('   Derived image:', derived);
      
      const heroImage = derived || rewriteHeroImage(currentImg) || '/placeholder.svg';
      console.log('   Final hero image:', heroImage);
      
      const finalPost = { 
        ...foundPost, 
        frontmatter: { ...foundPost.frontmatter, image: heroImage }, 
        content: html 
      };
      
      console.log('4. Post processing complete!');
      console.log('   Final post content length:', finalPost.content.length);
      
      // Check if images were converted
      if (finalPost.content.includes('itsquareupdatedcontent.s3.ap-east-1.amazonaws.com')) {
        console.log('✅ SUCCESS: Content images converted to S3 URLs');
      } else {
        console.log('❌ FAILURE: Content images NOT converted');
      }
      
      return finalPost;
    }
    
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return null;
  }
}

simulateUseEffect().then(result => {
  console.log('\n=== Final Result ===');
  if (result) {
    console.log('✅ Article processing successful');
    // Show sample of converted content
    const lines = result.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('src=') && lines[i].includes('itsquareupdatedcontent')) {
        console.log('Converted image tag:');
        console.log(lines[i].trim());
        break;
      }
    }
  } else {
    console.log('❌ Article processing failed');
  }
});
