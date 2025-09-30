#!/usr/bin/env node

/**
 * Test script for IT Event Browser functionality
 * Tests DynamoDB connection, data fetching, and component integration
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const REGION = 'ap-east-1';
const TABLE_NAME = 'MediaInvites';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Test functions
async function testDynamoDBConnection() {
  console.log('🔍 Testing DynamoDB connection...');
  
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1
    });

    const response = await docClient.send(command);
    console.log('✅ DynamoDB connection successful');
    console.log(`📊 Table exists with ${response.Count} items scanned`);
    return true;
  } catch (error) {
    console.error('❌ DynamoDB connection failed:', error.message);
    return false;
  }
}

async function testEventDataStructure() {
  console.log('🔍 Testing event data structure...');
  
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 5
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    if (items.length === 0) {
      console.log('⚠️  No events found in database');
      return false;
    }

    console.log(`📊 Found ${items.length} sample events`);

    // Analyze data structure
    const sampleEvent = items[0];
    const requiredFields = ['Id', 'date', 'event_name', 'location'];
    const optionalFields = ['description', 'category', 'speakers', 'vips', 'time'];

    console.log('\n📋 Event Data Structure Analysis:');
    
    // Check required fields
    requiredFields.forEach(field => {
      if (sampleEvent[field]) {
        console.log(`✅ ${field}: ${typeof sampleEvent[field]}`);
      } else {
        console.log(`❌ Missing required field: ${field}`);
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      if (sampleEvent[field]) {
        console.log(`✅ ${field}: ${typeof sampleEvent[field]}`);
      } else {
        console.log(`⚪ Optional field not present: ${field}`);
      }
    });

    // Check bilingual support
    if (sampleEvent.event_name && typeof sampleEvent.event_name === 'object') {
      console.log('✅ Bilingual event_name detected');
      console.log(`   EN: ${sampleEvent.event_name.en || 'Not available'}`);
      console.log(`   ZH: ${sampleEvent.event_name.zh || 'Not available'}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Event data structure test failed:', error.message);
    return false;
  }
}

async function testUpcomingEvents() {
  console.log('🔍 Testing upcoming events filter...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#eventDate >= :today',
      ExpressionAttributeNames: {
        '#eventDate': 'date'
      },
      ExpressionAttributeValues: {
        ':today': today
      }
    });

    const response = await docClient.send(command);
    const upcomingEvents = response.Items || [];

    console.log(`✅ Found ${upcomingEvents.length} upcoming events`);
    
    if (upcomingEvents.length > 0) {
      console.log('\n📅 Sample upcoming events:');
      upcomingEvents.slice(0, 3).forEach((event, index) => {
        const eventName = event.event_name?.en || event.event_name || 'Unnamed Event';
        const eventDate = event.date || 'No date';
        console.log(`   ${index + 1}. ${eventName} (${eventDate})`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Upcoming events test failed:', error.message);
    return false;
  }
}

async function testCategoryAnalysis() {
  console.log('🔍 Testing category analysis...');
  
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME
    });

    const response = await docClient.send(command);
    const events = response.Items || [];

    // Analyze categories
    const categoryCount = {};
    
    events.forEach(event => {
      if (event.category && Array.isArray(event.category)) {
        event.category.forEach(cat => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      }
    });

    const sortedCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    console.log('✅ Category analysis complete');
    console.log('\n📊 Top 10 Categories:');
    
    sortedCategories.forEach(([category, count], index) => {
      console.log(`   ${index + 1}. ${category}: ${count} events`);
    });

    return true;
  } catch (error) {
    console.error('❌ Category analysis test failed:', error.message);
    return false;
  }
}

async function testGeospatialData() {
  console.log('🔍 Testing geospatial data availability...');
  
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 50
    });

    const response = await docClient.send(command);
    const events = response.Items || [];

    let geospatialCount = 0;
    let geoaddressCount = 0;

    events.forEach(event => {
      if (event.location?.geospatial?.Latitude && event.location?.geospatial?.Longitude) {
        geospatialCount++;
      }
      if (event.location?.geoaddress) {
        geoaddressCount++;
      }
    });

    console.log(`✅ Geospatial analysis complete`);
    console.log(`📍 Events with coordinates: ${geospatialCount}/${events.length}`);
    console.log(`🏠 Events with addresses: ${geoaddressCount}/${events.length}`);

    return true;
  } catch (error) {
    console.error('❌ Geospatial data test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting IT Event Browser Tests\n');
  console.log('=' .repeat(50));

  const tests = [
    { name: 'DynamoDB Connection', fn: testDynamoDBConnection },
    { name: 'Event Data Structure', fn: testEventDataStructure },
    { name: 'Upcoming Events Filter', fn: testUpcomingEvents },
    { name: 'Category Analysis', fn: testCategoryAnalysis },
    { name: 'Geospatial Data', fn: testGeospatialData }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(30));
    
    const startTime = Date.now();
    const success = await test.fn();
    const duration = Date.now() - startTime;
    
    results.push({
      name: test.name,
      success,
      duration
    });

    console.log(`⏱️  Duration: ${duration}ms`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
  });

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! IT Event Browser is ready to deploy.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and try again.');
  }

  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  testDynamoDBConnection,
  testEventDataStructure,
  testUpcomingEvents,
  testCategoryAnalysis,
  testGeospatialData,
  runAllTests
};