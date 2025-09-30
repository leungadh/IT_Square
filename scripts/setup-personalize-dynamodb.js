const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'ap-east-1' });

const tables = [
  {
    TableName: 'UserBehavior',
    KeySchema: [
      { AttributeName: 'sessionId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'sessionId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'UserVectors',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'UserModels',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'RecommendationConfig',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'ContentVectors',
    KeySchema: [{ AttributeName: 'contentId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'contentId', AttributeType: 'S' },
      { AttributeName: 'contentType', AttributeType: 'S' },
      { AttributeName: 'popularityScore', AttributeType: 'N' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PopularityIndex',
        KeySchema: [
          { AttributeName: 'contentType', KeyType: 'HASH' },
          { AttributeName: 'popularityScore', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'FeedbackLog',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

async function createTable(tableConfig) {
  try {
    // Check if table exists
    await client.send(new DescribeTableCommand({ TableName: tableConfig.TableName }));
    console.log(`✅ Table ${tableConfig.TableName} already exists`);
    return;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
  }

  try {
    await client.send(new CreateTableCommand(tableConfig));
    console.log(`✅ Created table: ${tableConfig.TableName}`);
  } catch (error) {
    console.error(`❌ Error creating table ${tableConfig.TableName}:`, error.message);
  }
}

async function setupTables() {
  console.log('🚀 Setting up DynamoDB tables for personalized recommendations...\n');
  
  for (const table of tables) {
    await createTable(table);
  }
  
  console.log('\n✅ DynamoDB setup complete!');
}

setupTables().catch(console.error);