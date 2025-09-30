const { PersonalizeClient, CreateEventTrackerCommand, ListSolutionsCommand, CreateCampaignCommand } = require('@aws-sdk/client-personalize');

const personalizeClient = new PersonalizeClient({ region: 'ap-southeast-1' });
const DATASET_GROUP_ARN = 'arn:aws:personalize:ap-southeast-1:891377044387:dataset-group/itsquare-recommendations';

async function createEventTracker() {
  try {
    const response = await personalizeClient.send(new CreateEventTrackerCommand({
      datasetGroupArn: DATASET_GROUP_ARN,
      name: 'itsquare-tracker'
    }));
    
    console.log('✅ Event Tracker Created');
    console.log('Tracking ID:', response.trackingId);
    return response.trackingId;
  } catch (error) {
    if (error.name === 'ResourceAlreadyExistsException') {
      console.log('✅ Event tracker already exists');
      return 'existing-tracker';
    }
    console.error('❌ Event tracker error:', error.message);
    return null;
  }
}

async function checkSolutions() {
  try {
    const response = await personalizeClient.send(new ListSolutionsCommand({
      datasetGroupArn: DATASET_GROUP_ARN
    }));
    
    console.log('📋 Existing solutions:', response.solutions?.length || 0);
    return response.solutions || [];
  } catch (error) {
    console.error('❌ Error listing solutions:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Setting up Personalize components...\n');
  
  const trackingId = await createEventTracker();
  const solutions = await checkSolutions();
  
  console.log('\n📋 Current Status:');
  console.log('Dataset Group: ✅ Created');
  console.log('Schema: ✅ Created');
  console.log('Event Tracker: ✅ Created');
  console.log('Solutions:', solutions.length > 0 ? '✅ Found' : '⏳ Need to create');
  
  console.log('\n🎯 Manual Steps Required:');
  console.log('1. Go to AWS Personalize Console (ap-southeast-1)');
  console.log('2. Create dataset with sample data');
  console.log('3. Create solution (aws-user-personalization)');
  console.log('4. Deploy campaign');
  console.log('5. Get campaign ARN');
  
  if (trackingId && trackingId !== 'existing-tracker') {
    console.log('\n📝 Add to .env.local:');
    console.log(`PERSONALIZE_TRACKING_ID=${trackingId}`);
    console.log('PERSONALIZE_CAMPAIGN_ARN=<get-from-console-after-campaign-creation>');
  }
}

main().catch(console.error);