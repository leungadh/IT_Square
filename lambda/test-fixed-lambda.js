const handler = require('./s3-indexing-trigger-fixed').handler;

// Test event simulating S3 ObjectCreated event
const testEvent = {
  Records: [
    {
      eventVersion: '2.1',
      eventSource: 'aws:s3',
      awsRegion: 'ap-east-1',
      eventTime: '2025-01-27T10:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      s3: {
        bucket: {
          name: 'itsquareupdatedcontent'
        },
        object: {
          key: 'content/posts/2025/01/test-post.md'
        }
      }
    }
  ]
};

async function testLambda() {
  console.log('🧪 Testing Lambda function locally...');
  
  try {
    const result = await handler(testEvent);
    console.log('✅ Test successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testLambda();
}

module.exports = { testLambda };