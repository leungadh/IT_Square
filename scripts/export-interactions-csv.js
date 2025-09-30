const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-east-1' }));

async function exportInteractions() {
  console.log('📊 Exporting interactions to CSV...');
  
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
    
    const interactions = items
      .filter(item => item.contentId && item.contentId.startsWith('post:'))
      .map(item => ({
        USER_ID: item.userId,
        ITEM_ID: item.contentId.replace('post:', ''),
        TIMESTAMP: Math.floor(new Date(item.timestamp).getTime() / 1000),
        EVENT_TYPE: item.action === 'view' ? 'VIEW' : 'CLICK'
      }));

    const csv = [
      'USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE',
      ...interactions.map(i => `${i.USER_ID},${i.ITEM_ID},${i.TIMESTAMP},${i.EVENT_TYPE}`)
    ].join('\n');

    fs.writeFileSync('interactions.csv', csv);
    console.log(`✅ Exported ${interactions.length} interactions to interactions.csv`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

exportInteractions();