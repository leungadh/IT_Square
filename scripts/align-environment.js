#!/usr/bin/env node

/**
 * Environment Alignment Script
 * Safely aligns development environment with production requirements
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getCurrentNodeVersion() {
  return process.version.substring(1); // Remove 'v' prefix
}

function getTargetNodeVersion() {
  const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
  if (fs.existsSync(nvmrcPath)) {
    return fs.readFileSync(nvmrcPath, 'utf8').trim();
  }
  return '20.17.0'; // Default to LTS
}

function checkNvmInstalled() {
  try {
    execSync('command -v nvm', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function safelyAlignNodeVersion() {
  const current = getCurrentNodeVersion();
  const target = getTargetNodeVersion();
  
  console.log(`🔍 Current Node.js version: ${current}`);
  console.log(`🎯 Target Node.js version: ${target}`);
  
  if (current === target) {
    console.log('✅ Node.js version is already aligned');
    return true;
  }
  
  if (!checkNvmInstalled()) {
    console.warn('⚠️  NVM not found. Please install NVM for version management:');
    console.warn('   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
    console.warn('   Then restart your terminal and run this script again.');
    return false;
  }
  
  console.log('🔄 Attempting to align Node.js version...');
  
  try {
    // First, try to use the target version if already installed
    try {
      execSync(`bash -c "source ~/.nvm/nvm.sh && nvm use ${target}"`, { stdio: 'inherit' });
      console.log(`✅ Successfully switched to Node.js ${target}`);
      console.log('⚠️  Please restart your terminal or run: source ~/.nvm/nvm.sh && nvm use');
      return true;
    } catch {
      // If not installed, install it
      console.log(`📦 Installing Node.js ${target}...`);
      execSync(`bash -c "source ~/.nvm/nvm.sh && nvm install ${target} && nvm use ${target}"`, { stdio: 'inherit' });
      console.log(`✅ Successfully installed and switched to Node.js ${target}`);
      console.log('⚠️  Please restart your terminal or run: source ~/.nvm/nvm.sh && nvm use');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to align Node.js version:', error.message);
    console.error('💡 Manual steps:');
    console.error(`   1. nvm install ${target}`);
    console.error(`   2. nvm use ${target}`);
    console.error('   3. npm install');
    return false;
  }
}

function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  try {
    execSync('npm outdated', { stdio: 'inherit' });
  } catch {
    // npm outdated exits with code 1 when outdated packages exist
    console.log('⚠️  Some dependencies may be outdated');
  }
  
  console.log('✅ Dependencies checked');
  return true;
}

function createBackup() {
  const backupDir = path.join(__dirname, '..', '.backup');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `package-lock-${timestamp}.json`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    fs.copyFileSync(packageLockPath, backupPath);
    console.log(`📋 Backup created: ${backupPath}`);
  }
}

function main() {
  console.log('🚀 Starting environment alignment...\n');
  
  // Create backup first
  createBackup();
  
  const steps = [
    { name: 'Node.js version alignment', fn: safelyAlignNodeVersion },
    { name: 'Dependency check', fn: checkDependencies }
  ];
  
  for (const step of steps) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔧 ${step.name}`);
    console.log('='.repeat(50));
    
    const success = step.fn();
    if (!success) {
      console.error(`❌ Failed: ${step.name}`);
      console.error('🛑 Stopping alignment process');
      process.exit(1);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Environment alignment completed successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Restart your terminal or run: source ~/.nvm/nvm.sh && nvm use');
  console.log('2. Verify with: npm run env:check');
  console.log('3. Test locally with: npm run dev:s3');
  console.log('4. Deploy to staging: git push origin amplify-test');
  console.log('='.repeat(50));
}

if (require.main === module) {
  main();
}

module.exports = { safelyAlignNodeVersion, checkDependencies };
