#!/usr/bin/env node

import { DeploymentLogger } from '../src/lib/deployment-logger';
import { readdirSync } from 'fs';
import path from 'path';

async function checkDeploymentStatus() {
  const logger = new DeploymentLogger();
  
  try {
    console.log('🔍 Checking deployment status...\n');
    
    // Get recent deployments
    const logsDir = path.join(process.cwd(), 'deployment-logs');
    
    try {
      const logFiles = readdirSync(logsDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 5);
      
      if (logFiles.length === 0) {
        console.log('📄 No deployment logs found');
        return;
      }
      
      console.log('📊 Recent deployments:');
      console.log('='.repeat(80));
      
      for (const file of logFiles) {
        const log = await logger.getDeploymentLog(file.replace('.json', ''));
        if (log) {
          const date = new Date(log.timestamp).toLocaleString();
          const status = log.success ? '✅ SUCCESS' : '❌ FAILED';
          
          console.log(`${date} | ${status} | ${log.environment} | ${log.updatedFiles} changes`);
          console.log(`Deployment ID: ${log.deploymentId}`);
          console.log(`Duration: ${log.duration}ms`);
          console.log('-'.repeat(80));
        }
      }
      
    } catch (error) {
      console.log('📄 No deployment logs directory found');
    }
    
    // Check local state
    try {
      const localState = await logger.getLocalState();
      const fileCount = Object.keys(localState).length;
      console.log(`📋 Local state: ${fileCount} files tracked`);
      
    } catch (error) {
      console.log('📄 No local state found (first deployment)');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkDeploymentStatus();
}