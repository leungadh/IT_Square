#!/usr/bin/env node

/**
 * 文章数据导入脚本
 * 用于将示例文章导入到 S3 的 blog/ 前缀下作为 Markdown 文件
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-provider-ini');

// AWS 配置
const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET_NAME = process.env.S3_BUCKET || 'itsquareupdatedcontent'; // 请确保设置正确的环境变量

// 创建 S3 客户端
const client = new S3Client({ 
  region: REGION,
  credentials: process.env.AWS_PROFILE ? fromIni({ profile: process.env.AWS_PROFILE }) : undefined
});

// 示例文章数据 - 使用当前年月作为日期基础，确保在'home-latest'上下文中显示为最新
// 注意: 日期应设置为部署服务器时间的最近日期，以匹配固定逻辑（当前月内7天窗口）
const articles = [
  {
    id: 'ai-healthcare-001',
    category: 'AI/人工智能',
    title: '人工智能在医疗诊断中的革命性应用',
    description: '探索AI如何通过深度学习技术提高疾病诊断准确率，特别是在癌症早期筛查方面的突破',
    content: '# 人工智能医疗诊断革命\n\n人工智能正在彻底改变医疗诊断领域...',
    author: '医疗科技研究员 李明',
    image: 'https://example-bucket.s3.amazonaws.com/ai-medical-diagnosis.jpg',
    tags: ['AI', '医疗', '深度学习', '诊断'],
    interests: ['AI/人工智能', 'Biological Technology', '绿色科技'],
    date: new Date('2025-08-16T10:00:00Z').toISOString()
  },
  {
    id: 'green-finance-001',
    category: '綠色金融',
    title: '绿色债券市场2024年展望与投资机会',
    description: '分析全球绿色债券发行趋势，探讨ESG投资如何推动可持续金融发展',
    content: '# 绿色债券市场展望\n\n随着全球对气候变化的关注...',
    author: '绿色金融专家 陈慧',
    image: 'https://example-bucket.s3.amazonaws.com/green-bonds-2024.jpg',
    tags: ['绿色金融', 'ESG', '债券', '投资'],
    interests: ['綠色金融', '金融創新科技/FinTech', '環境社會管治', '碳中和'],
    date: new Date('2025-08-15T09:30:00Z').toISOString()
  },
  {
    id: 'cybersecurity-001',
    category: '網絡安全/Cyber Security',
    title: '2024年网络安全威胁趋势与防御策略',
    description: '深度分析AI驱动的网络攻击新形态，以及企业如何构建多层防御体系',
    content: '# 网络安全威胁趋势\n\n随着人工智能技术的普及...',
    author: '网络安全总监 张伟',
    image: 'https://example-bucket.s3.amazonaws.com/cybersecurity-trends-2024.jpg',
    tags: ['网络安全', 'AI攻击', '防御策略', '威胁检测'],
    interests: ['網絡安全/Cyber Security', '網絡攻擊', 'AI/人工智能'],
    date: new Date('2025-08-14T14:00:00Z').toISOString()
  },
  {
    id: 'fintech-001',
    category: '金融創新科技/FinTech',
    title: '央行数字货币(CBDC)对香港金融生态的影响',
    description: '探讨数字港元如何重塑支付系统，以及对传统银行业务模式的挑战与机遇',
    content: '# 央行数字货币的影响\n\n香港作为国际金融中心...',
    author: '金融科技分析师 王嘉',
    image: 'https://example-bucket.s3.amazonaws.com/cbdc-hong-kong.jpg',
    tags: ['CBDC', '数字货币', '支付系统', '银行业务'],
    interests: ['金融創新科技/FinTech', '香港創科', '數碼轉型'],
    date: new Date('2025-08-13T11:00:00Z').toISOString()
  },
  {
    id: 'hk-innovation-001',
    category: '香港創科',
    title: '香港科学园AI研发突破：本地初创获国际投资',
    description: '介绍香港科技园内人工智能初创企业的最新研发成果，以及获得的国际风险投资',
    content: '# 香港AI研发新突破\n\n香港科学园作为香港最大的创科基地...',
    author: '科技记者 林小美',
    image: 'https://example-bucket.s3.amazonaws.com/hkstp-ai-breakthrough.jpg',
    tags: ['香港', '科学园', 'AI', '初创企业'],
    interests: ['香港創科', '科學園／香港科技園公司／HKSTP', 'AI/人工智能', '大灣區創科'],
    date: new Date('2025-08-12T16:00:00Z').toISOString()
  },
  {
    id: 'cloud-computing-001',
    category: '雲運算',
    title: '混合云架构在企业数字化转型中的关键作用',
    description: '分析企业如何构建混合云架构，平衡数据安全与计算效率的需求',
    content: '# 混合云架构的重要性\n\n随着企业数字化转型的深入...',
    author: '云计算架构师 刘强',
    image: 'https://example-bucket.s3.amazonaws.com/hybrid-cloud-architecture.jpg',
    tags: ['云计算', '混合云', '数字化转型', '企业架构'],
    interests: ['雲運算', '數碼轉型', '數碼科技'],
    date: new Date('2025-08-11T13:00:00Z').toISOString()
  },
  {
    id: 'smart-city-001',
    category: '智慧城市',
    title: '香港智慧城市蓝图2030：IoT与5G技术应用场景',
    description: '深入探讨香港智慧城市发展的具体应用场景，包括智能交通、环境监测和公共服务',
    content: '# 香港智慧城市蓝图\n\n香港特别行政区政府推出的智慧城市蓝图...',
    author: '智慧城市专家 赵博士',
    image: 'https://example-bucket.s3.amazonaws.com/hk-smart-city-2030.jpg',
    tags: ['智慧城市', 'IoT', '5G', '香港'],
    interests: ['智慧城市', '香港創科', '數碼科技', '智能汽車'],
    date: new Date('2025-08-10T10:30:00Z').toISOString()
  },
  {
    id: 'new-energy-001',
    category: '新能源',
    title: '氢能源技术突破：香港新能源发展迎来新机遇',
    description: '介绍氢能源技术的最新进展，以及香港在新能源领域的投资和政策支持',
    content: '# 氢能源技术突破\n\n随着全球对清洁能源的需求增加...',
    author: '新能源研究员 陈博士',
    image: 'https://example-bucket.s3.amazonaws.com/hydrogen-energy-hk.jpg',
    tags: ['氢能源', '新能源', '清洁能源', '碳中和'],
    interests: ['新能源', '碳中和', '綠色科技', '綠色金融'],
    date: new Date('2025-08-09T15:00:00Z').toISOString()
  }
];

// 上传到 S3
async function importArticles() {
  try {
    console.log('开始导入文章数据...');
    
    for (const article of articles) {
      const frontMatter = `---\n` +
        `title: "${article.title}"\n` +
        `description: "${article.description}"\n` +
        `author: "${article.author}"\n` +
        `date: "${article.date}"\n` +
        `image: "${article.image}"\n` +
        `tags: [${article.tags.map(tag => `"${tag}"`).join(', ')}]\n` +
        `categories: [${article.category}]\n` +
        `---\n\n`;
      
      const mdContent = frontMatter + article.content;
      
      // 动态生成 S3 键，使用基于文章日期的 YYYY/MM 子文件夹
// 这确保了文章存储在正确的月度文件夹中，便于 API 通过月度索引发现
const dt = new Date(article.date);
const year = dt.getUTCFullYear();
const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
const key = `content/posts/${year}/${month}/${article.id}.md`;
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: mdContent,
        ContentType: 'text/markdown'
      };
      
      const command = new PutObjectCommand(params);
      await client.send(command);
      
      console.log(`已导入文章: ${article.id}`);
    }
    
    console.log('文章数据导入完成！');
  } catch (error) {
    console.error('导入失败:', error);
  }
}

// 执行导入
if (require.main === module) {
  importArticles();
}

module.exports = { importArticles };