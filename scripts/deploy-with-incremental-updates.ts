#!/usr/bin/env node

import { S3ContentManager } from '../src/lib/s3-client';
import { DeploymentLogger } from '../src/lib/deployment-logger';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

interface DeploymentOptions {
  environment: 'production' | 'staging';
  skipBuild?: boolean;
  forceFullSync?: boolean;
}

interface SyncLog {
  operation: string;
  fileKey: string;
}

class IncrementalDeployment {
  private s3Manager: S3ContentManager;
  private logger: DeploymentLogger;
  private options: DeploymentOptions;

  constructor(options: DeploymentOptions) {
    this.s3Manager = new S3ContentManager();
    this.logger = new DeploymentLogger();
    this.options = options;
  }

  async deploy() {
    const startTime = Date.now();
    const deploymentId = this.logger.generateDeploymentId();
    
    console.log(`🚀 Starting deployment: ${deploymentId}`);
    console.log(`📦 Environment: ${this.options.environment}`);
    
    try {
      // Step 1: Get current local state
      const localState = await this.logger.getLocalState();
      console.log(`📋 Found ${Object.keys(localState).length} files in local state`);

      // Step 2: Sync with S3 to find changes
      const { logs, updatedFiles } = await this.s3Manager.syncWithLocalState(localState);
      
      const summary = this.summarizeChanges(logs);
      console.log(`📊 Changes detected:`);
      console.log(`   - New files: ${summary.newFiles}`);
      console.log(`   - Updated files: ${summary.updatedFiles}`);
      console.log(`   - Deleted files: ${summary.deletedFiles}`);
      console.log(`   - Unchanged: ${summary.unchangedFiles}`);

      // Step 3: Download only changed files
      if (updatedFiles.length > 0 || summary.deletedFiles > 0 || this.options.forceFullSync) {
        console.log(`⬇️  Downloading ${updatedFiles.length} changed files...`);
        await this.downloadChangedFiles(updatedFiles as { key: string }[]);
        
        // Update local state
        const newLocalState = await this.buildNewLocalState(logs);
        await this.logger.saveLocalState(newLocalState);
      } else {
        console.log(`✅ No changes detected, skipping file download`);
      }

      // Step 4: Build Next.js (if not skipped)
      if (!this.options.skipBuild) {
        console.log(`🔨 Building Next.js application...`);
        await this.buildNextJS();
      }

      // Step 5: Save deployment log
      const deploymentLog = {
        deploymentId,
        timestamp: new Date().toISOString(),
        environment: this.options.environment,
        totalFiles: logs.length,
        updatedFiles: summary.updatedFiles,
        newFiles: summary.newFiles,
        deletedFiles: summary.deletedFiles,
        unchangedFiles: summary.unchangedFiles,
        syncLogs: logs,
        duration: Date.now() - startTime,
        success: true,
      };

      await this.logger.saveDeploymentLog(deploymentLog);
      
      console.log(`✅ Deployment completed successfully!`);
      console.log(`📄 Log saved: deployment-logs/${deploymentId}.json`);
      console.log(`⏱️  Duration: ${deploymentLog.duration}ms`);

      return deploymentLog;

    } catch (error) {
      const deploymentLog = {
        deploymentId,
        timestamp: new Date().toISOString(),
        environment: this.options.environment,
        totalFiles: 0,
        updatedFiles: 0,
        newFiles: 0,
        deletedFiles: 0,
        unchangedFiles: 0,
        syncLogs: [],
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      await this.logger.saveDeploymentLog(deploymentLog);
      console.error(`❌ Deployment failed: ${error}`);
      throw error;
    }
  }

  private summarizeChanges(logs: SyncLog[]) {
    return {
      newFiles: logs.filter(l => l.operation === 'added').length,
      updatedFiles: logs.filter(l => l.operation === 'updated').length,
      deletedFiles: logs.filter(l => l.operation === 'deleted').length,
      unchangedFiles: logs.filter(l => l.operation === 'unchanged').length,
    };
  }

  private async downloadChangedFiles(files: {key: string}[]) {
    const contentDir = path.join(process.cwd(), 'content');
    
    for (const file of files) {
      const content = await this.s3Manager.getFileContent(file.key);
      const localPath = path.join(contentDir, file.key.replace(/^content\//, ''));
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      await fs.writeFile(localPath, content);

      console.log(`   📥 Downloaded: ${file.key} -> ${localPath}`);
    }
  }

  private async buildNewLocalState(logs: SyncLog[]): Promise<Record<string, string> > {
    const newState: Record<string, string> = {};
    
    for (const log of logs) {
      if (log.operation === 'deleted') {
        // Skip deleted files
        continue;
      }
      
      const metadata = await this.s3Manager.getFileMetadata(log.fileKey);
      if (metadata) {
        newState[log.fileKey] = metadata.etag;
      }
    }
    
    return newState;
  }

  private async buildNextJS() {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args.includes('--staging') ? 'staging' : 'production';
  const skipBuild = args.includes('--skip-build');
  const forceFullSync = args.includes('--force-full-sync');

  const deployment = new IncrementalDeployment({
    environment,
    skipBuild,
    forceFullSync,
  });

  try {
    await deployment.deploy();
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { IncrementalDeployment };