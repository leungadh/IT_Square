#!/usr/bin/env node

// Test the slug normalization logic
function normalizeSlug(s) {
  // Remove 'post:' prefix if present (case insensitive)
  let norm = s.replace(/^post:/i, '');
  
  // Trim whitespace and convert to lowercase for consistent matching
  norm = norm.trim().toLowerCase();
  
  // Remove any trailing hyphens
  norm = norm.replace(/-+$/, '');
  
  return norm;
}

console.log('🧪 Testing slug normalization...\n');

// Test cases based on what we expect
const testCases = [
  // What tracking stores vs what posts have
  { input: 'post:hashkey', expected: 'hashkey', description: 'Standard post tracking' },
  { input: 'post:HKBNElderlySolution', expected: 'hkbnelderlysolution', description: 'Mixed case post' },
  { input: 'post:nmpa', expected: 'nmpa', description: 'Short slug' },
  { input: 'post:datachallenge', expected: 'datachallenge', description: 'Single word slug' },
  { input: 'post:20250905huawei', expected: '20250905huawei', description: 'Date prefixed slug' },
  { input: 'post:20250905fhki', expected: '20250905fhki', description: 'Another date prefixed slug' },
  
  // Edge cases
  { input: 'hashkey', expected: 'hashkey', description: 'Already normalized' },
  { input: 'post:test-slug-', expected: 'test-slug', description: 'Trailing hyphen' },
  { input: 'post:  spaced  ', expected: 'spaced', description: 'With spaces' },
  { input: 'POST:UPPERCASE', expected: 'uppercase', description: 'All uppercase' },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = normalizeSlug(testCase.input);
  const success = result === testCase.expected;
  
  console.log(`${success ? '✅' : '❌'} ${testCase.description}`);
  console.log(`   Input: "${testCase.input}"`);
  console.log(`   Expected: "${testCase.expected}"`);
  console.log(`   Got: "${result}"`);
  
  if (success) {
    passed++;
  } else {
    failed++;
    console.log(`   ❌ MISMATCH!`);
  }
  console.log('');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! The normalization logic should work correctly.');
} else {
  console.log('⚠️  Some tests failed. The normalization logic needs adjustment.');
}

// Test with actual popular post slugs
console.log('\n🔍 Testing with known popular post slugs:');
const knownSlugs = ['hashkey', 'HKBNElderlySolution', 'nmpa', 'datachallenge', '20250905huawei', '20250905fhki'];

for (const slug of knownSlugs) {
  const trackingId = `post:${slug}`;
  const normalized = normalizeSlug(trackingId);
  const postSlugNormalized = normalizeSlug(slug);
  
  const match = normalized === postSlugNormalized;
  console.log(`${match ? '✅' : '❌'} Tracking: "${trackingId}" -> "${normalized}"`);
  console.log(`     Post: "${slug}" -> "${postSlugNormalized}"`);
  console.log(`     Match: ${match}`);
  console.log('');
}