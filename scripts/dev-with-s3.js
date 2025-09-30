#!/usr/bin/env node
/**
 * Development server that uses the same S3 content as Amplify
 * This allows local iteration to match Amplify behavior exactly
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting IT-Square development server with S3 content...');
console.log('📡 This will use the same S3 bucket as Amplify for seamless iteration');

// Set environment variables for S3-based development
const env = {
  ...process.env,
  NODE_ENV: 'development',
  NEXT_PUBLIC_ENV: 'development',
  AWS_REGION: 'ap-east-1',
  NEXT_PUBLIC_AWS_REGION: 'ap-east-1',
  NEXT_PUBLIC_S3_BUCKET: 'itsquareupdatedcontent',
  S3_BUCKET_NAME: 'itsquareupdatedcontent',
  CONTENT_SOURCE: 's3',
  NEXT_PUBLIC_CONTENT_SOURCE: 's3',
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  DEBUG_CONTENT_LOADING: 'true'
};

console.log('🔧 Environment configured:');
console.log('   - Content Source: S3 (same as Amplify)');
console.log('   - Bucket: itsquareupdatedcontent');
console.log('   - Region: ap-east-1');
console.log('   - Debug: Enabled');
console.log('');

// Start Next.js development server
const nextDev = spawn('npm', ['run', 'dev'], {
  env,
  stdio: 'inherit',
  cwd: process.cwd()
});

nextDev.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
});

nextDev.on('error', (error) => {
  console.error('Failed to start development server:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  nextDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM');
});
