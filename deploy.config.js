// Deployment Configuration
const stagingConfig = require('./config/staging');
const productionConfig = require('./config/production');

const getConfig = () => {
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || 'main';
  
  if (branch === 'staging') {
    return stagingConfig;
  } else if (branch === 'main') {
    return productionConfig;
  } else {
    // Default to staging for other branches
    return stagingConfig;
  }
};

module.exports = {
  getConfig,
  stagingConfig,
  productionConfig,
  
  // Deployment scripts
  scripts: {
    staging: {
      build: 'npm run build:staging',
      deploy: 'vercel --prod --scope=staging',
      test: 'npm run test && npm run e2e:staging'
    },
    production: {
      build: 'npm run build:production',
      deploy: 'aws-deploy-script',
      test: 'npm run test && npm run e2e:production'
    }
  }
};
