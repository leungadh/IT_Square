#!/usr/bin/env node

/**
 * Environment Checker Script
 * Ensures development and production environments are aligned
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function checkNodeVersion() {
  const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(nvmrcPath)) {
    console.error('❌ .nvmrc file not found');
    return false;
  }
  
  const expectedVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
  const currentVersion = process.version.substring(1); // Remove 'v' prefix
  
  console.log(`📋 Expected Node.js version: ${expectedVersion}`);
  console.log(`🔍 Current Node.js version: ${currentVersion}`);
  
  if (!currentVersion.startsWith(expectedVersion.split('.').slice(0, 2).join('.'))) {
    console.warn(`⚠️  Version mismatch detected!`);
    console.warn(`   Expected: ${expectedVersion}`);
    console.warn(`   Current:  ${currentVersion}`);
    console.warn(`   Run: nvm use ${expectedVersion}`);
    console.warn(`   Note: This won't block development, but may cause deployment issues`);
    return false;
  }
  
  console.log('✅ Node.js version is aligned');
  return true;
}

function checkPackageEngines() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.engines || !packageJson.engines.node) {
    console.error('❌ Package.json missing engines specification');
    return false;
  }
  
  console.log('✅ Package.json engines specification found');
  return true;
}

function checkAmplifyConfig() {
  const amplifyYmlPath = path.join(__dirname, '..', 'amplify.yml');
  
  if (!fs.existsSync(amplifyYmlPath)) {
    console.error('❌ amplify.yml not found');
    return false;
  }
  
  const amplifyConfig = fs.readFileSync(amplifyYmlPath, 'utf8');
  const nvmrcVersion = fs.readFileSync(path.join(__dirname, '..', '.nvmrc'), 'utf8').trim();
  
  if (!amplifyConfig.includes(`nvm use ${nvmrcVersion}`)) {
    console.warn('⚠️  Amplify.yml may not be using the correct Node.js version');
    return false;
  }
  
  console.log('✅ Amplify.yml Node.js version is aligned');
  return true;
}

function main() {
  console.log('🔍 Checking environment alignment...\n');
  
  const checks = [
    checkNodeVersion,
    checkPackageEngines,
    checkAmplifyConfig
  ];
  
  const results = checks.map(check => check());
  const allPassed = results.every(result => result);
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All environment checks passed!');
    console.log('✅ Development and Amplify environments are aligned');
  } else {
    console.log('⚠️  Some environment checks have warnings');
    console.log('💡 Consider running: npm run env:align');
    console.log('📝 This won\'t block development, but alignment is recommended for deployment');
    // Don't exit with error code - just warn
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkNodeVersion, checkPackageEngines, checkAmplifyConfig };
