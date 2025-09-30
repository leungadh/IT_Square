const { PersonalizeClient, CreateDatasetGroupCommand, CreateDatasetCommand, CreateSchemaCommand } = require('@aws-sdk/client-personalize');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const personalizeClient = new PersonalizeClient({ region: 'ap-southeast-1' });
const s3Client = new S3Client({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-east-1' })); // Keep DynamoDB in ap-east-1

const BUCKET = 'itsquareupdatedcontent';
const DATASET_GROUP_NAME = 'itsquare-recommendations';

async function exportUserBehaviorData() {
  console.log('📊 Exporting user behavior data from DynamoDB...');
  
  try {
    const command = new ScanCommand({
      TableName: 'UserBehavior',
      ProjectionExpression: 'userId, contentId, #ts, #act',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
        '#act': 'action'
      }
    });

    const response = await dynamoClient.send(command);
    const items = response.Items || [];
    
    // Convert to Personalize format
    const interactions = items
      .filter(item => item.contentId && item.contentId.startsWith('post:'))
      .map(item => ({
        USER_ID: item.userId,
        ITEM_ID: item.contentId.replace('post:', ''),
        TIMESTAMP: Math.floor(new Date(item.timestamp).getTime() / 1000),
        EVENT_TYPE: item.action === 'view' ? 'VIEW' : 'CLICK'
      }));

    console.log(`✅ Exported ${interactions.length} interactions`);
    return interactions;
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    return [];
  }
}

async function createPersonalizeResources() {
  console.log('🚀 Setting up Amazon Personalize...');

  // 1. Create Dataset Group
  try {
    const datasetGroupResponse = await personalizeClient.send(new CreateDatasetGroupCommand({
      name: DATASET_GROUP_NAME
    }));
    console.log('✅ Created dataset group:', datasetGroupResponse.datasetGroupArn);
  } catch (error) {
    if (error.name === 'ResourceAlreadyExistsException') {
      console.log('✅ Dataset group already exists');
    } else {
      console.error('❌ Error creating dataset group:', error);
      return;
    }
  }

  // 2. Create Schema
  const interactionSchema = {
    type: "record",
    name: "Interactions",
    namespace: "com.amazonaws.personalize.schema",
    fields: [
      { name: "USER_ID", type: "string" },
      { name: "ITEM_ID", type: "string" },
      { name: "TIMESTAMP", type: "long" },
      { name: "EVENT_TYPE", type: "string" }
    ],
    version: "1.0"
  };

  try {
    const schemaResponse = await personalizeClient.send(new CreateSchemaCommand({
      name: `${DATASET_GROUP_NAME}-interactions-schema`,
      schema: JSON.stringify(interactionSchema)
    }));
    console.log('✅ Created schema:', schemaResponse.schemaArn);
  } catch (error) {
    if (error.name === 'ResourceAlreadyExistsException') {
      console.log('✅ Schema already exists');
    } else {
      console.error('❌ Error creating schema:', error);
    }
  }

  console.log('\n🎯 Next steps:');
  console.log('1. Go to AWS Personalize console');
  console.log('2. Create dataset using the schema');
  console.log('3. Import interaction data');
  console.log('4. Create solution and train model');
  console.log('5. Deploy campaign');
  console.log('6. Update .env.local with ARNs');
}

async function uploadInteractionData() {
  const interactions = await exportUserBehaviorData();
  
  if (interactions.length === 0) {
    console.log('⚠️  No interaction data found. Generate some by browsing articles first.');
    return;
  }

  // Convert to CSV
  const csv = [
    'USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE',
    ...interactions.map(i => `${i.USER_ID},${i.ITEM_ID},${i.TIMESTAMP},${i.EVENT_TYPE}`)
  ].join('\n');

  // Upload to S3
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'personalize-data/interactions.csv',
      Body: csv,
      ContentType: 'text/csv'
    }));
    
    console.log('✅ Uploaded interaction data to S3');
    console.log(`📍 Location: s3://${BUCKET}/personalize-data/interactions.csv`);
  } catch (error) {
    console.error('❌ Error uploading to S3:', error);
  }
}

async function main() {
  await uploadInteractionData();
  await createPersonalizeResources();
}

main().catch(console.error);