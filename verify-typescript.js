#!/usr/bin/env node

/**
 * TypeScript Verification Script
 * Checks for common TypeScript issues that might cause build failures
 */

const fs = require('fs');
console.log('🔍 TypeScript Verification Script');
console.log('================================');

// Check if tsconfig.json exists and is valid
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  console.log('✅ tsconfig.json is valid');
  console.log(`   - Strict mode: ${tsconfig.compilerOptions.strict}`);
  console.log(`   - Target: ${tsconfig.compilerOptions.target}`);
} catch (error) {
  console.log('❌ tsconfig.json issue:', error.message);
}

// Check for common problematic patterns
const problematicPatterns = [
  { pattern: /new Date\([^)]*as\s+string[^)]*\)/, file: 'src/app/api/graphql/route.ts', description: 'Inline Date casting' },
  { pattern: /input\.[a-zA-Z]/, file: 'src/app/api/graphql/route.ts', description: 'Direct input property access' },
  { pattern: /\.substr\(/, file: 'src/app/api/graphql/route.ts', description: 'Deprecated substr method' }
];

let issuesFound = 0;

problematicPatterns.forEach(({ pattern, file, description }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⚠️  Found ${description} in ${file}`);
      issuesFound++;
    } else {
      console.log(`✅ No ${description} found in ${file}`);
    }
  }
});

// Check package.json for TypeScript version
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const tsVersion = packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript;
  if (tsVersion) {
    console.log(`✅ TypeScript version: ${tsVersion}`);
  } else {
    console.log('⚠️  TypeScript not found in dependencies');
  }
} catch (error) {
  console.log('❌ package.json issue:', error.message);
}

console.log('\n📊 Summary:');
if (issuesFound === 0) {
  console.log('✅ No TypeScript issues detected');
  console.log('🚀 Build should succeed on Amplify');
} else {
  console.log(`❌ Found ${issuesFound} potential issues`);
  console.log('🔧 Review and fix the issues above');
}