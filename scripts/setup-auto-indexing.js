#!/usr/bin/env node
/**
 * Setup script for automatic S3 search indexing
 * 
 * This script:
 * 1. Creates/updates the Lambda function for automatic indexing
 * 2. Sets up S3 event notifications to trigger the Lambda
 * 3. Configures proper IAM permissions
 */

const { 
  LambdaClient, 
  CreateFunctionCommand, 
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  AddPermissionCommand
} = require('@aws-sdk/client-lambda');
const { 
  S3Client, 
  PutBucketNotificationConfigurationCommand,
  GetBucketNotificationConfigurationCommand 
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const REGION = process.env.AWS_REGION || 'ap-east-1';
const BUCKET = process.env.S3_BUCKET_NAME || 'itsquareupdatedcontent';
const FUNCTION_NAME = 'itsquare-s3-indexing-trigger';

const lambda = new LambdaClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

async function main() {
  console.log('Setting up automatic S3 search indexing...');
  console.log({ REGION, BUCKET, FUNCTION_NAME });

  try {
    // Step 1: Create or update Lambda function
    const functionArn = await deployLambdaFunction();
    console.log('✅ Lambda function deployed:', functionArn);

    // Step 2: Add S3 permission to Lambda
    await addS3Permission(functionArn);
    console.log('✅ S3 permission added to Lambda');

    // Step 3: Configure S3 event notification
    await configureS3Notification(functionArn);
    console.log('✅ S3 event notification configured');

    console.log('\n🎉 Automatic indexing setup complete!');
    console.log('\nNow when you upload new .md files to content/posts/, the search indexes will be automatically rebuilt.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function deployLambdaFunction() {
  // Read Lambda function code
  const lambdaCodePath = path.join(__dirname, '../lambda/s3-indexing-trigger.js');
  const lambdaCode = fs.readFileSync(lambdaCodePath, 'utf8');
  
  // Create ZIP buffer (simple single-file Lambda)
  const zipBuffer = await createSimpleZip('s3-indexing-trigger.js', lambdaCode);

  try {
    // Try to get existing function
    await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
    
    // Function exists, update it
    console.log('Updating existing Lambda function...');
    await lambda.send(new UpdateFunctionCodeCommand({
      FunctionName: FUNCTION_NAME,
      ZipFile: zipBuffer,
    }));
    
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      // Function doesn't exist, create it
      console.log('Creating new Lambda function...');
      await lambda.send(new CreateFunctionCommand({
        FunctionName: FUNCTION_NAME,
        Runtime: 'nodejs22.x',
        Role: process.env.LAMBDA_ROLE_ARN || `arn:aws:iam::${await getAccountId()}:role/lambda-execution-role`,
        Handler: 's3-indexing-trigger.handler',
        Code: { ZipFile: zipBuffer },
        Description: 'Automatically rebuild search indexes when S3 content changes',
        Timeout: 300,
        MemorySize: 512,
        Environment: {
          Variables: {
            S3_BUCKET_NAME: BUCKET,
            POSTS_PREFIX: 'content/posts/',
            METADATA_PREFIX: 'content/metadata/'
          }
        }
      }));
    } else {
      throw error;
    }
  }

  // Get function ARN
  const func = await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
  return func.Configuration.FunctionArn;
}

async function addS3Permission(functionArn) {
  try {
    await lambda.send(new AddPermissionCommand({
      FunctionName: FUNCTION_NAME,
      StatementId: 's3-indexing-trigger-permission',
      Action: 'lambda:InvokeFunction',
      Principal: 's3.amazonaws.com',
      SourceArn: `arn:aws:s3:::${BUCKET}`,
    }));
  } catch (error) {
    if (error.name === 'ResourceConflictException') {
      console.log('S3 permission already exists, skipping...');
    } else {
      throw error;
    }
  }
}

async function configureS3Notification(functionArn) {
  // Get existing notifications
  let existingConfig;
  try {
    const result = await s3.send(new GetBucketNotificationConfigurationCommand({ Bucket: BUCKET }));
    existingConfig = result;
  } catch (error) {
    existingConfig = {};
  }

  // Add our Lambda configuration
  const lambdaConfigurations = existingConfig.LambdaFunctionConfigurations || [];
  
  // Remove any existing configuration for our function
  const filteredConfigurations = lambdaConfigurations.filter(
    config => !config.LambdaFunctionArn.includes(FUNCTION_NAME)
  );

  // Add new configuration
  filteredConfigurations.push({
    Id: 'search-indexing-trigger',
    LambdaFunctionArn: functionArn,
    Events: ['s3:ObjectCreated:*', 's3:ObjectRemoved:*'],
    Filter: {
      Key: {
        FilterRules: [
          { Name: 'prefix', Value: 'content/posts/' },
          { Name: 'suffix', Value: '.md' }
        ]
      }
    }
  });

  console.log('Existing config:', JSON.stringify(existingConfig));
  console.log('New lambda configurations:', JSON.stringify(filteredConfigurations));

  // Update S3 notification configuration
  try {
    await s3.send(new PutBucketNotificationConfigurationCommand({
      Bucket: BUCKET,
      NotificationConfiguration: {
        ...existingConfig,
        LambdaFunctionConfigurations: filteredConfigurations
      }
    }));
    console.log('Notification configuration updated successfully');
  } catch (error) {
    console.error('Error updating notification:', error);
    throw error;
  }
}

async function createSimpleZip(filename, content) {
  const stream = require('stream');
  const Buffer = require('buffer').Buffer;

  return new Promise((resolve, reject) => {
    const output = new stream.PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers = [];

    output.on('data', (d) => buffers.push(d));
    output.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', reject);
    archive.pipe(output);
    archive.append(content, { name: filename });
    archive.finalize();
  });
}

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function getAccountId() {
  if (process.env.AWS_ACCOUNT_ID) {
    return process.env.AWS_ACCOUNT_ID;
  }
  const sts = new STSClient({ region: REGION });
  const response = await sts.send(new GetCallerIdentityCommand({}));
  return response.Account;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
