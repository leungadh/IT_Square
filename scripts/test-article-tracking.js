#!/usr/bin/env node

// Test if article tracking is working for datachallenge
async function testArticleTracking() {
  console.log('🧪 Testing article tracking for datachallenge...\n');
  
  try {
    // 1. Check if the article page loads
    console.log('1. Testing article page access...');
    const articleResponse = await fetch('http://localhost:3000/article/2025/09/datachallenge');
    console.log(`   Article page status: ${articleResponse.status}`);
    
    if (articleResponse.ok) {
      const html = await articleResponse.text();
      const hasTitle = html.includes('港隊在滬港數據競賽奪兩大獎項');
      console.log(`   Article content loaded: ${hasTitle ? '✅' : '❌'}`);
    }
    
    // 2. Check current popular posts data
    console.log('\n2. Checking current popular posts data...');
    const popularResponse = await fetch('http://localhost:3000/api/popular-posts');
    const posts = await popularResponse.json();
    
    const datachallengePost = posts.find(p => p.slug === 'datachallenge');
    if (datachallengePost) {
      console.log('   Current datachallenge stats:');
      console.log(`   - Views: ${datachallengePost.viewCount}`);
      console.log(`   - Unique visitors: ${datachallengePost.uniqueVisitors}`);
      console.log(`   - Popularity score: ${datachallengePost.popularityScore}`);
      console.log(`   - Trending score: ${datachallengePost.trendingScore}`);
    } else {
      console.log('   ❌ datachallenge post not found in popular posts');
    }
    
    // 3. Check if we can manually trigger tracking
    console.log('\n3. Testing manual tracking simulation...');
    
    // Simulate what the useUserBehavior hook does
    const trackingData = {
      action: 'view',
      contentType: 'post',
      contentId: 'post:datachallenge',
      category: 'AI/人工智能',
      tags: ['數據創新', '智慧科技', '滬港合作'],
      searchQuery: '港隊在滬港數據競賽奪兩大獎項 展現智慧科技實力',
      dwellMs: 5000,
      timestamp: new Date().toISOString(),
      userId: 'test-user-' + Date.now(),
      sessionId: 'test-session-' + Date.now()
    };
    
    console.log('   Simulated tracking data:');
    console.log('   - contentId:', trackingData.contentId);
    console.log('   - action:', trackingData.action);
    console.log('   - contentType:', trackingData.contentType);
    
    // 4. Test the user behavior API endpoint if it exists
    console.log('\n4. Testing user behavior API...');
    try {
      const behaviorResponse = await fetch('http://localhost:3000/api/user-behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData)
      });
      
      console.log(`   User behavior API status: ${behaviorResponse.status}`);
      if (behaviorResponse.ok) {
        console.log('   ✅ Tracking API is working');
      } else {
        console.log('   ❌ Tracking API failed');
      }
    } catch (error) {
      console.log('   ⚠️  User behavior API not available or error:', error.message);
    }
    
    // 5. Wait a moment and check if data updated
    console.log('\n5. Waiting 2 seconds and checking for updates...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedResponse = await fetch('http://localhost:3000/api/popular-posts?v=' + Date.now());
    const updatedPosts = await updatedResponse.json();
    const updatedPost = updatedPosts.find(p => p.slug === 'datachallenge');
    
    if (updatedPost) {
      console.log('   Updated datachallenge stats:');
      console.log(`   - Views: ${updatedPost.viewCount}`);
      console.log(`   - Unique visitors: ${updatedPost.uniqueVisitors}`);
      console.log(`   - Popularity score: ${updatedPost.popularityScore}`);
      
      if (updatedPost.viewCount > 0) {
        console.log('   ✅ Tracking is working!');
      } else {
        console.log('   ❌ Still no tracking data');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testArticleTracking().then(() => {
  console.log('\n✅ Test complete');
}).catch(console.error);