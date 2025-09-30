#!/usr/bin/env node

/**
 * AWS Knowledge Base Query Client
 * 
 * Usage:
 *   node query-kb.js "your query here" [knowledge-base-id]
 * 
 * Prerequisites:
 * 1. AWS credentials configured (aws configure)
 * 2. Knowledge base created in AWS Bedrock
 * 3. MCP server installed: uvx awslabs.bedrock-kb-retrieval-mcp-server
 */

const { execSync } = require('child_process');
const { run_mcp } = require('./mcp-client-helper');

async function queryKnowledgeBase(query, knowledgeBaseId) {
  try {
    console.log(`🔍 Querying knowledge base: ${knowledgeBaseId}`);
    console.log(`📋 Query: ${query}`);
    
    // Use the MCP server to query
    const result = await run_mcp({
      server_name: "mcp.config.usrlocalmcp.AWS Knowledge Base",
      tool_name: "retrieve_from_aws_kb",
      args: {
        query: query,
        knowledgeBaseId: knowledgeBaseId,
        n: 5
      }
    });
    
    console.log('✅ Results:', JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error('❌ Error querying knowledge base:', error.message);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const query = args[0] || "AWS Amplify best practices";
  const kbId = args[1] || "your-knowledge-base-id";
  
  queryKnowledgeBase(query, kbId)
    .then(results => {
      console.log('\n📊 Summary:');
      console.log(`Found ${results.length || 0} relevant documents`);
    })
    .catch(console.error);
}

module.exports = { queryKnowledgeBase };