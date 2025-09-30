const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function seedConfig() {
  console.log('🌱 Seeding recommendation configuration...');

  // Default recommendation weights
  const defaultWeights = {
    id: 'weights',
    weights: {
      contentSimilarity: 0.4,
      userBehavior: 0.3,
      recency: 0.1,
      popularity: 0.1,
      categoryMatch: 0.05,
      tagMatch: 0.05,
      authorMatch: 0.0
    },
    updatedAt: new Date().toISOString()
  };

  // Personalize configuration
  const personalizeConfig = {
    id: 'current',
    categoryWeight: 0.4,
    tagWeight: 0.3,
    authorWeight: 0.2,
    recencyWeight: 0.1,
    freshnessHalfLifeDays: 21,
    updatedAt: new Date().toISOString()
  };

  try {
    await docClient.send(new PutCommand({
      TableName: 'RecommendationConfig',
      Item: defaultWeights
    }));
    console.log('✅ Seeded default weights configuration');

    await docClient.send(new PutCommand({
      TableName: 'RecommendationConfig',
      Item: personalizeConfig
    }));
    console.log('✅ Seeded Personalize configuration');

    console.log('\n🎯 Configuration seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding configuration:', error);
  }
}

seedConfig();