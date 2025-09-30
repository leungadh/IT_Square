#!/usr/bin/env ts-node
/**
 * Seed DynamoDB with synthetic view counts so popular-posts can rank immediately.
 * Run: npx ts-node scripts/seed-popular-data.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: 'ap-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

const POSTS = [
  { id: '20250810-ai-breakthrough', title: 'AI Breakthrough in August 2025', category: 'AI', tags: ['AI', 'Innovation', 'August'], viewCount: 1200, likeCount: 45, commentCount: 12 },
  { id: '20250809-visa-tech', title: 'Visa Tech Update', category: 'Finance', tags: ['Visa', 'Payment'], viewCount: 800, likeCount: 30, commentCount: 8 },
  { id: '20250805-visa-payment', title: 'Visa Payment Trends', category: 'Finance', tags: ['Visa', 'Payment'], viewCount: 600, likeCount: 20, commentCount: 5 },
  { id: '20250801-google-ai', title: 'Google AI Insights', category: 'AI', tags: ['Google', 'AI'], viewCount: 900, likeCount: 35, commentCount: 10 },
  { id: '20250801-taxipay', title: 'Taxipay Integration', category: 'Finance', tags: ['Taxipay', 'Integration'], viewCount: 700, likeCount: 25, commentCount: 7 },
  { id: '20250801-visa-google', title: 'Visa Google Partnership', category: 'Finance', tags: ['Visa', 'Google'], viewCount: 500, likeCount: 15, commentCount: 4 },
  { id: '20250811-picture1', title: 'Picture 1 Analysis', category: 'Tech', tags: ['Analysis', 'Tech'], viewCount: 400, likeCount: 10, commentCount: 3 },
  { id: '20250809-image1', title: 'Image 1 Insights', category: 'Tech', tags: ['Image', 'Insights'], viewCount: 300, likeCount: 8, commentCount: 2 },
  { id: '20250805-visa', title: 'Visa Trends', category: 'Finance', tags: ['Visa', 'Trends'], viewCount: 200, likeCount: 5, commentCount: 1 },
  { id: '20250801-visa-google-2', title: 'Visa Google 2', category: 'Finance', tags: ['Visa', 'Google'], viewCount: 100, likeCount: 2, commentCount: 0 },
];

async function seed() {
  console.log('Seeding DynamoDB with synthetic popular-post data...');
  for (const post of POSTS) {
    await docClient.send(new PutCommand({
      TableName: 'Posts',
      Item: {
        id: post.id,
        title: post.title,
        category: post.category,
        tags: post.tags,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isPublished: 'true',
        createdAt: new Date().toISOString(),
      },
    }));
  }
  console.log('✅ Seeded', POSTS.length, 'posts with view counts');
}

seed().catch(console.error);