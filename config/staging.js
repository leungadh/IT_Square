// Staging Environment Configuration
module.exports = {
  // Base URL for staging
  baseUrl: 'https://staging-makinghkit.vercel.app',
  
  // Environment
  environment: 'staging',
  
  // AWS Configuration for staging
  aws: {
    region: 'ap-east-1',
    s3Bucket: 'itsquareupdatedcontent-staging',
  },
  
  // Analytics (use test/staging keys)
  analytics: {
    googleAnalyticsId: 'G-XXXXXXXXXX-STAGING',
  },
  
  // Debug settings
  debug: true,
  
  // API endpoints
  api: {
    baseUrl: 'https://staging-api-makinghkit.vercel.app',
  },
  
  // Feature flags for staging
  features: {
    enableBetaFeatures: true,
    enableDebugMode: true,
    enableTestData: true,
  }
};
