#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// AWS Configuration
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  throw new Error('Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
}

const client = new DynamoDBClient({
  region: 'ap-east-1', // Hong Kong region
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const docClient = DynamoDBDocumentClient.from(client);

// Sample Categories
const categories = [
  {
    id: 'cat-ai-artificial-intelligence',
    name: 'AI/人工智能',
    description: 'Artificial Intelligence and Machine Learning technologies',
    slug: 'ai-artificial-intelligence',
    parentCategory: null,
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-biological-technology',
    name: 'Biological Technology',
    description: 'Biotech innovations and research',
    slug: 'biological-technology',
    parentCategory: null,
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-green-finance',
    name: '綠色金融',
    description: 'Green finance and sustainable investment',
    slug: 'green-finance',
    parentCategory: null,
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-cloud-computing',
    name: '雲運算',
    description: 'Cloud computing and infrastructure',
    slug: 'cloud-computing',
    parentCategory: null,
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-cybersecurity',
    name: '網絡安全/Cyber Security',
    description: 'Cybersecurity and digital protection',
    slug: 'cybersecurity',
    parentCategory: null,
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Sample Tags
const tags = [
  {
    id: 'tag-ai',
    name: 'AI',
    description: 'Artificial Intelligence',
    slug: 'ai',
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tag-machine-learning',
    name: 'Machine Learning',
    description: 'Machine Learning algorithms and applications',
    slug: 'machine-learning',
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tag-fintech',
    name: 'FinTech',
    description: 'Financial Technology innovations',
    slug: 'fintech',
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tag-blockchain',
    name: 'Blockchain',
    description: 'Blockchain and distributed ledger technology',
    slug: 'blockchain',
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tag-cybersecurity',
    name: 'Cybersecurity',
    description: 'Digital security and protection',
    slug: 'cybersecurity',
    postCount: 0,
    reportCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Sample AI Reports
const aiReports = [
  {
    id: 'report-001',
    title: 'AI-Powered Market Analysis: Q4 2024 Tech Sector Outlook',
    description: 'Comprehensive analysis of emerging AI trends in the technology sector, including machine learning adoption rates, investment patterns, and market opportunities for 2024.',
    content: 'This report provides an in-depth analysis of the AI technology sector...',
    author: 'Dr. Sarah Chen',
    category: 'AI/人工智能',
    tags: ['AI', 'Machine Learning', 'Market Analysis'],
    s3Key: 'aistockreport/2024-01/ai-market-analysis-q4-2024.pdf',
    dynamoDbId: 'report-001',
    publishedDate: '2024-01-15T10:00:00Z',
    lastUpdated: '2024-01-15T10:00:00Z',
    viewCount: 1250,
    downloadCount: 340,
    rating: 4.8,
    fileSize: 2048576,
    fileType: 'pdf'
  },
  {
    id: 'report-002',
    title: 'Machine Learning in Financial Services: Risk Assessment Revolution',
    description: 'How AI and machine learning are transforming risk assessment in financial services, with case studies from major banks and fintech companies.',
    content: 'The financial services industry is undergoing a significant transformation...',
    author: 'Michael Rodriguez',
    category: '綠色金融',
    tags: ['Machine Learning', 'FinTech', 'Risk Assessment'],
    s3Key: 'aistockreport/2024-01/ml-financial-services-risk.pdf',
    dynamoDbId: 'report-002',
    publishedDate: '2024-01-12T10:00:00Z',
    lastUpdated: '2024-01-12T10:00:00Z',
    viewCount: 980,
    downloadCount: 280,
    rating: 4.6,
    fileSize: 1572864,
    fileType: 'pdf'
  }
];

// Sample Posts
const posts = [
  {
    id: 'post-001',
    title: 'The Future of Artificial Intelligence in 2024',
    description: 'Explore the latest breakthroughs in AI technology, from large language models to autonomous systems, and their impact on various industries.',
    content: 'Artificial Intelligence continues to evolve at an unprecedented pace...',
    author: 'Tech Reporter',
    category: 'AI/人工智能',
    tags: ['AI', 'Machine Learning', 'Technology'],
    image: '/images/blog/2024/01/ai-future-2024.jpg',
    publishedDate: '2024-01-15T10:00:00Z',
    lastUpdated: '2024-01-15T10:00:00Z',
    viewCount: 45700,
    likeCount: 1240,
    commentCount: 89,
    isPublished: true
  },
  {
    id: 'post-002',
    title: 'Blockchain & Cryptocurrency Trends',
    description: 'Discover the evolving landscape of blockchain technology, DeFi platforms, and the future of digital currencies in the global economy.',
    content: 'Blockchain technology has moved far beyond its cryptocurrency origins...',
    author: 'Crypto Analyst',
    category: '綠色金融',
    tags: ['Blockchain', 'Cryptocurrency', 'DeFi'],
    image: '/images/blog/2024/01/blockchain-trends.jpg',
    publishedDate: '2024-01-14T10:00:00Z',
    lastUpdated: '2024-01-14T10:00:00Z',
    viewCount: 34200,
    likeCount: 890,
    commentCount: 67,
    isPublished: true
  },
  {
    id: 'post-003',
    title: 'Cybersecurity Best Practices for Enterprises',
    description: 'Learn essential cybersecurity strategies, threat detection methods, and protection measures for modern business environments.',
    content: 'In today\'s digital landscape, cybersecurity is more critical than ever...',
    author: 'Security Expert',
    category: '網絡安全/Cyber Security',
    tags: ['Cybersecurity', 'Enterprise', 'Security'],
    image: '/images/blog/2024/01/cybersecurity-enterprise.jpg',
    publishedDate: '2024-01-13T10:00:00Z',
    lastUpdated: '2024-01-13T10:00:00Z',
    viewCount: 28900,
    likeCount: 756,
    commentCount: 45,
    isPublished: true
  }
];

async function seedData() {
  console.log('🌱 Seeding sample data for IT-Square recommendation system...\n');
  
  try {
    // Seed Categories
    console.log('📂 Seeding categories...');
    for (const category of categories) {
      await docClient.send(new PutCommand({
        TableName: 'Categories',
        Item: category
      }));
      console.log(`  ✅ ${category.name}`);
    }
    
    // Seed Tags
    console.log('\n🏷️  Seeding tags...');
    for (const tag of tags) {
      await docClient.send(new PutCommand({
        TableName: 'Tags',
        Item: tag
      }));
      console.log(`  ✅ ${tag.name}`);
    }
    
    // Seed AI Reports
    console.log('\n📊 Seeding AI reports...');
    for (const report of aiReports) {
      await docClient.send(new PutCommand({
        TableName: 'AIReports',
        Item: report
      }));
      console.log(`  ✅ ${report.title}`);
    }
    
    // Seed Posts
    console.log('\n📝 Seeding posts...');
    for (const post of posts) {
      await docClient.send(new PutCommand({
        TableName: 'Posts',
        Item: post
      }));
      console.log(`  ✅ ${post.title}`);
    }
    
    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Categories: ${categories.length}`);
    console.log(`  - Tags: ${tags.length}`);
    console.log(`  - AI Reports: ${aiReports.length}`);
    console.log(`  - Posts: ${posts.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// Run the seeding
if (require.main === module) {
  seedData().catch(console.error);
}

module.exports = { seedData, categories, tags, aiReports, posts };
