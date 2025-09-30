// Production Environment Configuration
module.exports = {
  // Base URL for production
  baseUrl: 'https://it-square.hk',
  
  // Environment
  environment: 'production',
  
  // AWS Configuration for production
  aws: {
    region: 'ap-east-1',
    s3Bucket: 'itsquareupdatedcontent',
  },
  
  // Analytics (production keys)
  analytics: {
    googleAnalyticsId: 'G-XXXXXXXXXX-PROD',
  },
  
  // Debug settings
  debug: false,
  
  // API endpoints
  api: {
    baseUrl: 'https://api-makinghkit.com',
  },
  
  // Feature flags for production
  features: {
    enableBetaFeatures: false,
    enableDebugMode: false,
    enableTestData: false,
  }
};
