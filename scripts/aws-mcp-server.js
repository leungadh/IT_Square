#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { execSync } = require('child_process');

class AWSMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'aws-deployment-helper',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'amplify_get_job_status',
            description: 'Get the status of an Amplify deployment job',
            inputSchema: {
              type: 'object',
              properties: {
                appId: {
                  type: 'string',
                  description: 'Amplify app ID',
                },
                branchName: {
                  type: 'string',
                  description: 'Branch name',
                  default: 'main'
                }
              },
              required: ['appId'],
            },
          },
          {
            name: 's3_list_objects',
            description: 'List objects in an S3 bucket with a prefix',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: {
                  type: 'string',
                  description: 'S3 bucket name',
                },
                prefix: {
                  type: 'string',
                  description: 'Object prefix to filter by',
                }
              },
              required: ['bucket'],
            },
          },
          {
            name: 's3_get_object',
            description: 'Get content of an S3 object',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: {
                  type: 'string',
                  description: 'S3 bucket name',
                },
                key: {
                  type: 'string',
                  description: 'S3 object key',
                }
              },
              required: ['bucket', 'key'],
            },
          },
          {
            name: 'iam_get_role_policies',
            description: 'Get policies attached to an IAM role',
            inputSchema: {
              type: 'object',
              properties: {
                roleName: {
                  type: 'string',
                  description: 'IAM role name',
                }
              },
              required: ['roleName'],
            },
          },
          {
            name: 'amplify_start_deployment',
            description: 'Start a new Amplify deployment',
            inputSchema: {
              type: 'object',
              properties: {
                appId: {
                  type: 'string',
                  description: 'Amplify app ID',
                },
                branchName: {
                  type: 'string',
                  description: 'Branch name',
                  default: 'main'
                }
              },
              required: ['appId'],
            },
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'amplify_get_job_status':
            return await this.getAmplifyJobStatus(args.appId, args.branchName || 'main');
          
          case 's3_list_objects':
            return await this.listS3Objects(args.bucket, args.prefix);
          
          case 's3_get_object':
            return await this.getS3Object(args.bucket, args.key);
          
          case 'iam_get_role_policies':
            return await this.getIAMRolePolicies(args.roleName);
          
          case 'amplify_start_deployment':
            return await this.startAmplifyDeployment(args.appId, args.branchName || 'main');
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getAmplifyJobStatus(appId, branchName) {
    const cmd = `aws amplify list-jobs --app-id ${appId} --branch-name ${branchName} --max-items 1 --output json`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const jobs = JSON.parse(result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(jobs, null, 2),
        },
      ],
    };
  }

  async listS3Objects(bucket, prefix = '') {
    const prefixArg = prefix ? `--prefix "${prefix}"` : '';
    const cmd = `aws s3api list-objects-v2 --bucket ${bucket} ${prefixArg} --output json`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const objects = JSON.parse(result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(objects, null, 2),
        },
      ],
    };
  }

  async getS3Object(bucket, key) {
    const cmd = `aws s3api get-object --bucket ${bucket} --key "${key}" /tmp/s3-object.tmp && cat /tmp/s3-object.tmp`;
    const result = execSync(cmd, { encoding: 'utf8' });
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  async getIAMRolePolicies(roleName) {
    const cmd = `aws iam list-attached-role-policies --role-name ${roleName} --output json`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const policies = JSON.parse(result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(policies, null, 2),
        },
      ],
    };
  }

  async startAmplifyDeployment(appId, branchName) {
    const cmd = `aws amplify start-job --app-id ${appId} --branch-name ${branchName} --job-type RELEASE --output json`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const job = JSON.parse(result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(job, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AWS MCP Server running on stdio');
  }
}

const server = new AWSMCPServer();
server.run().catch(console.error);

