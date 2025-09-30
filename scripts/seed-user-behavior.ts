#!/usr/bin/env ts-node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

import { getDynamoDBConfig } from '../src/lib/aws-config.ts';
const client = new DynamoDBClient(getDynamoDBConfig());
const docClient = DynamoDBDocumentClient.from(client);

const SAMPLE_EVENTS = [
  // Sample views for different posts
  { contentId: 'post:nmpa', action: 'view', sessionId: 'session1', timestamp: new Date().toISOString(), dwellMs: 120000 },
  { contentId: 'post:nmpa', action: 'view', sessionId: 'session2', timestamp: new Date(Date.now() - 3600000).toISOString(), dwellMs: 180000 },
  { contentId: 'post:HKBNElderlySolution', action: 'view', sessionId: 'session3', timestamp: new Date().toISOString(), dwellMs: 90000 },
  { contentId: 'post:hashkey', action: 'view', sessionId: 'session4', timestamp: new Date().toISOString(), dwellMs: 150000 },
  // Add more events as needed
];

async function seed() {
  console.log('Seeding UserBehavior with sample data...');
  const requests = SAMPLE_EVENTS.map(event => ({
    PutRequest: {
      Item: {
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        action: event.action,
        contentId: event.contentId,
        dwellMs: event.dwellMs,
      }
    }
  }));
  await docClient.send(new BatchWriteCommand({
    RequestItems: { 'UserBehavior': requests }
  }));
  console.log('✅ Seeded', SAMPLE_EVENTS.length, 'events');
}

seed().catch(console.error);