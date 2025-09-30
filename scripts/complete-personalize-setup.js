const { PersonalizeClient, CreateDatasetCommand, CreateDatasetImportJobCommand, CreateSolutionCommand, CreateCampaignCommand, DescribeDatasetImportJobCommand, DescribeSolutionVersionCommand, CreateEventTrackerCommand } = require('@aws-sdk/client-personalize');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

const personalizeClient = new PersonalizeClient({ region: 'ap-southeast-1' });
const s3Client = new S3Client({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-east-1' }));

const DATASET_GROUP_ARN = 'arn:aws:personalize:ap-southeast-1:891377044387:dataset-group/itsquare-recommendations';
const SCHEMA_ARN = 'arn:aws:personalize:ap-southeast-1:891377044387:schema/itsquare-recommendations-interactions-schema';
const S3_BUCKET = 'personalize-itsquare-data';
const IAM_ROLE = 'arn:aws:iam::891377044387:role/PersonalizeS3Role';

async function createS3Bucket() {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: 'test.txt',
      Body: 'test'
    }));
    console.log('✅ S3 bucket accessible');
  } catch (error) {
    console.log('⚠️  S3 bucket needs to be created manually in ap-southeast-1');
  }
}

async function uploadInteractionData() {
  console.log('📊 Uploading interaction data...');
  
  try {
    const command = new ScanCommand({
      TableName: 'UserBehavior',
      ProjectionExpression: 'userId, contentId, #ts, #act',
      ExpressionAttributeNames: { '#ts': 'timestamp', '#act': 'action' }
    });

    const response = await dynamoClient.send(command);
    const items = response.Items || [];
    
    const interactions = items
      .filter(item => item.contentId && item.contentId.startsWith('post:'))
      .map(item => ({
        USER_ID: item.userId,
        ITEM_ID: item.contentId.replace('post:', ''),
        TIMESTAMP: Math.floor(new Date(item.timestamp).getTime() / 1000),
        EVENT_TYPE: item.action === 'view' ? 'VIEW' : 'CLICK'
      }));

    // Add some sample data if we don't have enough
    if (interactions.length < 10) {
      const sampleData = [
        { USER_ID: 'user1', ITEM_ID: 'ai-breakthrough-2024', TIMESTAMP: Math.floor(Date.now() / 1000) - 86400, EVENT_TYPE: 'VIEW' },
        { USER_ID: 'user1', ITEM_ID: 'fintech-innovation', TIMESTAMP: Math.floor(Date.now() / 1000) - 7200, EVENT_TYPE: 'VIEW' },
        { USER_ID: 'user2', ITEM_ID: 'ai-breakthrough-2024', TIMESTAMP: Math.floor(Date.now() / 1000) - 3600, EVENT_TYPE: 'VIEW' },
        { USER_ID: 'user2', ITEM_ID: 'green-finance', TIMESTAMP: Math.floor(Date.now() / 1000) - 1800, EVENT_TYPE: 'VIEW' },
        { USER_ID: 'user3', ITEM_ID: 'cybersecurity-update', TIMESTAMP: Math.floor(Date.now() / 1000) - 900, EVENT_TYPE: 'VIEW' }
      ];
      interactions.push(...sampleData);
    }

    const csv = [
      'USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE',
      ...interactions.map(i => `${i.USER_ID},${i.ITEM_ID},${i.TIMESTAMP},${i.EVENT_TYPE}`)
    ].join('\n');

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: 'interactions.csv',
      Body: csv,
      ContentType: 'text/csv'
    }));
    
    console.log(`✅ Uploaded ${interactions.length} interactions to S3`);
    return `s3://${S3_BUCKET}/interactions.csv`;
  } catch (error) {
    console.error('❌ Error uploading data:', error);
    return null;
  }
}

async function createDatasetAndImport() {
  console.log('📋 Creating dataset...');
  
  try {
    const datasetResponse = await personalizeClient.send(new CreateDatasetCommand({
      datasetGroupArn: DATASET_GROUP_ARN,
      datasetType: 'Interactions',
      name: 'itsquare-interactions',
      schemaArn: SCHEMA_ARN
    }));
    
    const datasetArn = datasetResponse.datasetArn;
    console.log('✅ Created dataset:', datasetArn);
    
    const s3Path = await uploadInteractionData();
    if (!s3Path) return null;
    
    const importResponse = await personalizeClient.send(new CreateDatasetImportJobCommand({
      datasetArn,
      dataSource: { dataLocation: s3Path },
      jobName: `import-${Date.now()}`,
      roleArn: IAM_ROLE
    }));
    
    console.log('✅ Started data import job');
    return { datasetArn, importJobArn: importResponse.datasetImportJobArn };
  } catch (error) {
    console.error('❌ Dataset creation error:', error.message);
    return null;
  }
}

async function createSolutionAndCampaign(datasetArn) {
  console.log('🧠 Creating solution...');
  
  try {
    const solutionResponse = await personalizeClient.send(new CreateSolutionCommand({
      datasetGroupArn: DATASET_GROUP_ARN,
      name: 'itsquare-solution',
      recipeArn: 'arn:aws:personalize:::recipe/aws-user-personalization'
    }));
    
    console.log('✅ Created solution, training will take 1-2 hours');
    console.log('⏳ Solution ARN:', solutionResponse.solutionArn);
    
    return solutionResponse.solutionArn;
  } catch (error) {
    console.error('❌ Solution creation error:', error.message);
    return null;
  }
}

async function createEventTracker() {
  try {
    const trackerResponse = await personalizeClient.send(new CreateEventTrackerCommand({
      datasetGroupArn: DATASET_GROUP_ARN,
      name: 'itsquare-tracker'
    }));
    
    console.log('✅ Created event tracker');
    return trackerResponse.trackingId;
  } catch (error) {
    console.error('❌ Event tracker error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Completing Amazon Personalize setup...\n');
  
  await createS3Bucket();
  
  const dataset = await createDatasetAndImport();
  if (!dataset) {
    console.log('❌ Failed to create dataset');
    return;
  }
  
  const solutionArn = await createSolutionAndCampaign(dataset.datasetArn);
  const trackingId = await createEventTracker();
  
  console.log('\n📋 Setup Summary:');
  console.log('Dataset Group:', DATASET_GROUP_ARN);
  console.log('Solution ARN:', solutionArn);
  console.log('Tracking ID:', trackingId);
  
  console.log('\n⏳ Next Steps:');
  console.log('1. Wait for solution training (1-2 hours)');
  console.log('2. Create campaign when training completes');
  console.log('3. Add ARNs to .env.local');
}

main().catch(console.error);