// Force origin refresh by creating a unique URL that CloudFront must fetch fresh
const timestamp = Date.now();
const uniqueParam = `cf_refresh=${timestamp}`;

console.log('=== CloudFront Origin Refresh Strategy ===');
console.log('1. CloudFront invalidation may not have worked properly');
console.log('2. Origin cache might be stale');
console.log('3. Need to force fresh fetch from origin');
console.log('');
console.log('Test URLs to try:');
console.log(`https://it-square.hk/contact?${uniqueParam}`);
console.log(`https://it-square.hk/contact?v=${timestamp}`);
console.log(`https://it-square.hk/contact?bust=${Math.random()}`);
console.log('');
console.log('If these still fail, the issue is:');
console.log('- CloudFront distribution pointing to wrong origin');
console.log('- Origin (Amplify) not serving main branch');
console.log('- CloudFront behavior rules blocking fresh content');
console.log('');
console.log('Manual fix required:');
console.log('1. Check CloudFront distribution origin settings');
console.log('2. Verify Amplify main branch deployment');
console.log('3. Create new CloudFront invalidation with /* pattern');
console.log('4. Wait 10-15 minutes for global propagation');