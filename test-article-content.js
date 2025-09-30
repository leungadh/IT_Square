const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Simulate the actual content from the API response
const content = `
近年來，隨著國家「十四五」規劃提出深化滬港合作，兩地在人才培育和創新創業領域的合作愈發緊密。近日，香港理工大學（[理大](https://www.polyu.edu.hk)）與上海高級金融學院（[高金](https://www.saif.sjtu.edu.cn)）香港基金會攜手推出「滬港青年成長營」，為兩地青年搭建了一個跨地域學習與交流的平台。活動吸引了逾40名來自內地及海外知名大學的青年代表參與，並以「金融與科技」及「創新與創業」為核心主題，激發青年在新時代的發展潛能。

<figure style="float: right; margin-left: 1em; margin-bottom: 1em;">
<img src="/images/blog/2025/08/20250820polyusaif2.webp" alt="理大副校長（研究及創新）趙汝恒教授於結業禮上致辭。" />
<figcaption>理大副校長趙汝恒教授與參與「滬港青年成長營」的學生合照。</figcaption>
</figure>

### 多元課程設計 助力青年成長

本次成長營於2025年8月3日至9日在上海舉行，課程內容涵蓋專題講座、企業參訪、案例研討等多種形式。課題設計聚焦於中國資本市場的發展脈絡（包括資本市場的歷史和現狀）、金融如何賦能科技創新、以及人工智能（<span style="font-family: sans-serif; color: #0000FF;" title="人工智能是模擬人類智能的技術，包括機器學習、自然語言處理等應用。">AI</span>）前沿動態等議題。主辦方期望透過理論與實踐並重的教學方式，結合實地參觀與頭部企業互動，培養學員的跨學科思維，並提升其創新創業能力。

理大副校長（研究及創新）趙汝恒教授在結業禮上致辭時表示：「理大秉承『開物成務 勵學利民』的校訓精神。校方致力於培育擁有家國情懷、具備全球視野的青年，並持續強化他們勇於承擔社會責任的意識。本次活動不僅讓學員獲得了寶貴的學習機會，也促進了滬港青年的共同成長。」

此外，香港特別行政區政府駐上海經濟貿易辦事處副主任梁穎然女士亦指出，該活動為香港青年提供了深入了解內地發展的窗口，是滬港兩地服務國家戰略的具體實踐。授課嘉賓尚海龍先生，同時擔任香港立法會議員及商湯科技（[SenseTime](https://www.sensetime.com)）戰略顧問，則鼓勵青年要「知國情、懂港情」，在放眼世界的同時心懷祖國。

### 學生反饋積極 展現跨學科潛力

參與成長營的學員背景多元，其中包括理大生物醫學工程系博士畢業生林樂庚同學。他表示：「這次活動讓我開闊了跨學科的科創視野，深刻體會到學術研究需兼顧理論突破與成果轉化。」另一位來自理大專業及持續教育學院的黃立芙同學則認為，跨學科學習幫助她打破傳統思維框架，重新定義了未來的可能性。

同日下午，理大還舉辦了「港理大×易匯資本2025國際未來挑戰賽」（上海賽區）決賽。15支頂尖創新創業團隊競逐多項獎項及總值人民幣27萬元的獎金，其中綜合評分最高的四強團隊將晉級今年12月在深圳舉行的總決賽。

### 深化滬港合作 共建創新未來

展望未來，理大擬與內地多省市政府及高金香港基金會深化合作。此舉將進一步加強滬港聯合教育培育模式，擴展創新創業合作的空間。學生透過此類活動，既能深入了解中國經濟發展現狀，亦可拓展國際視野，這種雙重價值體現了教育機構推動青年全面成長的承擔。活動亦為滬港高校合作樹立借鏡，預計將為國家現代化建設持續貢獻智慧與力量。
`;

console.log('Original content length:', content.length);

const rendered = md.render(content || '');
console.log('Rendered HTML length:', rendered.length);

function rewriteContentImagesToS3Static(html) {
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  
  function map(url) {
    if (!url) return url;
    // eslint-disable-next-line no-useless-escape
    if (/^https?:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/static\/images\/blog\//i.test(url)) return url;
     
    const relMatch = url.replace(/^\//, '').match(/^(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (relMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${relMatch[1]}`;
    }
    // eslint-disable-next-line no-useless-escape
    const siteAbsMatch = url.match(/^https?:\/\/[^\/]+\/(?:static\/)?(?:content\/)?(images\/blog\/[0-9]{4}\/[0-9]{2}\/.+)$/i);
    if (siteAbsMatch) {
      return `https://${bucket}.s3.${region}.amazonaws.com/static/${siteAbsMatch[1]}`;
    }
    return url;
  }
  
  return html.replace(/src\s*=\s*([\"'])([^\"']+)\1/gi, (_m, quote, url) => `src=${quote}${map(url)}${quote}`);
}

const html = rewriteContentImagesToS3Static(rendered);
console.log('Final HTML length:', html.length);

// Check if images were converted
if (html.includes('itsquareupdatedcontent.s3.ap-east-1.amazonaws.com')) {
  console.log('✅ Images successfully converted to S3 URLs');
} else {
  console.log('❌ Images were NOT converted to S3 URLs');
}

// Show a sample of the converted content
console.log('\nSample of converted content:');
const lines = html.split('\n');
for (let i = 0; i < Math.min(10, lines.length); i++) {
  if (lines[i].includes('src=')) {
    console.log(lines[i].trim());
  }
}
