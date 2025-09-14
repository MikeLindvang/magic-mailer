#!/usr/bin/env node

/**
 * Test script for the complete asset upload flow
 * 
 * This script tests:
 * 1. Text content ingestion
 * 2. URL content ingestion
 * 3. Asset retrieval
 * 4. Chunk creation and embedding
 * 
 * Usage: node scripts/test-asset-upload.js
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * Test data for ingestion
 */
const TEST_DATA = {
  text: {
    title: 'Test Document',
    content: `# Test Document

This is a test document for the Magic Mailer ingestion system.

## Features

- Text processing
- Markdown support
- Automatic chunking

## Benefits

The system provides:

1. **Fast Processing**: Content is processed quickly
2. **Smart Chunking**: Content is intelligently divided
3. **Vector Search**: Semantic search capabilities

This document contains enough content to create multiple chunks for testing purposes.`
  },
  url: {
    title: 'Web Content Test',
    url: 'https://example.com' // Simple test URL
  }
};

/**
 * Mock authentication for testing
 * In a real test, you'd use a test user token
 */
const MOCK_USER_ID = 'test-user-123';
const MOCK_PROJECT_ID = '507f1f77bcf86cd799439011'; // Valid ObjectId format

/**
 * Test text content ingestion
 */
async function testTextIngestion() {
  console.log('\n🧪 Testing Text Content Ingestion...');
  
  try {
    const response = await fetch(`${API_BASE}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real tests, you'd include proper authentication headers
        'Authorization': `Bearer mock-token`
      },
      body: JSON.stringify({
        projectId: MOCK_PROJECT_ID,
        source: {
          type: 'text',
          value: TEST_DATA.text.content
        },
        assetType: 'md',
        title: TEST_DATA.text.title
      })
    });

    const result = await jsonResponse();
    
    if (response.ok && result.ok) {
      console.log('✅ Text ingestion successful');
      console.log(`   Asset ID: ${result.data.assetId}`);
      console.log(`   Chunks created: ${result.data.chunkCount}`);
      return result.data.assetId;
    } else {
      console.log('❌ Text ingestion failed');
      console.log(`   Error: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Text ingestion error');
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

/**
 * Test URL content ingestion
 */
async function testUrlIngestion() {
  console.log('\n🧪 Testing URL Content Ingestion...');
  
  try {
    const response = await fetch(`${API_BASE}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token`
      },
      body: JSON.stringify({
        projectId: MOCK_PROJECT_ID,
        source: {
          type: 'url',
          value: TEST_DATA.url.url
        },
        assetType: 'html',
        title: TEST_DATA.url.title
      })
    });

    const result = await jsonResponse();
    
    if (response.ok && result.ok) {
      console.log('✅ URL ingestion successful');
      console.log(`   Asset ID: ${result.data.assetId}`);
      console.log(`   Chunks created: ${result.data.chunkCount}`);
      return result.data.assetId;
    } else {
      console.log('❌ URL ingestion failed');
      console.log(`   Error: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ URL ingestion error');
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

/**
 * Test asset retrieval
 */
async function testAssetRetrieval() {
  console.log('\n🧪 Testing Asset Retrieval...');
  
  try {
    const response = await fetch(`${API_BASE}/api/projects/${MOCK_PROJECT_ID}/assets`, {
      headers: {
        'Authorization': `Bearer mock-token`
      }
    });

    const result = await jsonResponse();
    
    if (response.ok && result.ok) {
      console.log('✅ Asset retrieval successful');
      console.log(`   Assets found: ${result.data.length}`);
      
      result.data.forEach((asset, index) => {
        console.log(`   Asset ${index + 1}:`);
        console.log(`     ID: ${asset._id}`);
        console.log(`     Title: ${asset.title}`);
        console.log(`     Type: ${asset.type}`);
        console.log(`     Chunks: ${asset.chunkCount || 0}`);
      });
      
      return result.data;
    } else {
      console.log('❌ Asset retrieval failed');
      console.log(`   Error: ${result.error}`);
      return [];
    }
  } catch (error) {
    console.log('❌ Asset retrieval error');
    console.log(`   Error: ${error.message}`);
    return [];
  }
}

/**
 * Test health check
 */
async function testHealthCheck() {
  console.log('\n🧪 Testing API Health...');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const result = await jsonResponse();
    
    if (response.ok && result.ok) {
      console.log('✅ API is healthy');
      return true;
    } else {
      console.log('❌ API health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ API health check error');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Magic Mailer Asset Upload Flow Tests');
  console.log(`📡 API Base URL: ${API_BASE}`);
  
  // Test API health first
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.log('\n❌ API is not healthy. Please start the development server first.');
    process.exit(1);
  }
  
  // Run ingestion tests
  const textAssetId = await testTextIngestion();
  const urlAssetId = await testUrlIngestion();
  
  // Test asset retrieval
  const assets = await testAssetRetrieval();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Text Ingestion: ${textAssetId ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   URL Ingestion: ${urlAssetId ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Asset Retrieval: ${assets.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = [textAssetId, urlAssetId, assets.length > 0].filter(Boolean).length;
  const totalTests = 3;
  
  console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The asset upload flow is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}

/**
 * Usage instructions
 */
function showUsage() {
  console.log(`
📖 Usage Instructions:

1. Start the development server:
   npm run dev

2. Set up environment variables in .env.local:
   - OPENAI_API_KEY (for embeddings)
   - MONGODB_URI (for database)
   - CLERK_SECRET_KEY (for authentication)

3. Run this test script:
   node scripts/test-asset-upload.js

Note: This script uses mock authentication for testing.
For production testing, implement proper authentication.
`);
}

// Run tests if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    runTests().catch(console.error);
  }
}

export { runTests, testTextIngestion, testUrlIngestion, testAssetRetrieval };
