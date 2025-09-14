#!/usr/bin/env node

/**
 * Simple test script for the /api/generate endpoint
 * This script tests the API endpoint directly without requiring a full server setup
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_PROJECT_ID = 'test_' + nanoid(8);
const TEST_USER_ID = 'user_' + nanoid(8);

/**
 * Setup test data in MongoDB
 */
async function setupTestData() {
  console.log('📝 Setting up test data...');
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const now = new Date().toISOString();
  
  // Create test project
  const project = {
    _id: TEST_PROJECT_ID,
    name: 'AI Email Test Project',
    description: 'Test project for email generation',
    status: 'active',
    userId: TEST_USER_ID,
    default_link: 'https://example.com/product',
    createdAt: now,
    updatedAt: now,
  };
  
  await db.collection('projects').insertOne(project);
  console.log(`✅ Created project: ${TEST_PROJECT_ID}`);
  
  // Create test chunks with sample embeddings
  const chunks = [
    {
      chunkId: nanoid(),
      projectId: TEST_PROJECT_ID,
      md_text: `# Revolutionary Productivity Tool
      
Our AI-powered productivity platform helps busy professionals save 5+ hours per week by automating repetitive tasks. 

Key features:
- Smart workflow automation
- Real-time team collaboration  
- Advanced analytics dashboard
- Seamless integration with 50+ tools

Perfect for teams struggling with manual processes and looking to boost efficiency.`,
      meta: {
        hpath: ['Product', 'Features'],
        source: 'product-overview.md'
      },
      embedding: Array.from({length: 1536}, () => Math.random() - 0.5), // Dummy embedding
      createdAt: now
    },
    {
      chunkId: nanoid(),
      projectId: TEST_PROJECT_ID,
      md_text: `# Customer Pain Points Research

Recent survey of 500 knowledge workers revealed:

- 78% spend 2-3 hours daily on repetitive manual tasks
- 65% report feeling overwhelmed by administrative work
- 52% say manual processes lead to frequent errors
- 71% want better automation tools

The cost of inefficiency is enormous - both in time and employee satisfaction.`,
      meta: {
        hpath: ['Research', 'Pain Points'],
        source: 'customer-research.md'
      },
      embedding: Array.from({length: 1536}, () => Math.random() - 0.5), // Dummy embedding
      createdAt: now
    },
    {
      chunkId: nanoid(),
      projectId: TEST_PROJECT_ID,
      md_text: `# Customer Success Stories

"This tool transformed our operations. We've saved 15 hours per week and reduced errors by 90%." - Sarah Johnson, Operations Director

"Our team productivity increased 40% in the first month. The ROI was immediate." - Mike Chen, Startup Founder  

"Finally, a solution that actually works. Our employees love the time savings." - Lisa Park, HR Manager

Results speak for themselves - happier teams, better outcomes.`,
      meta: {
        hpath: ['Testimonials', 'Success Stories'],
        source: 'testimonials.md'
      },
      embedding: Array.from({length: 1536}, () => Math.random() - 0.5), // Dummy embedding
      createdAt: now
    }
  ];
  
  await db.collection('chunks').insertMany(chunks);
  console.log(`✅ Created ${chunks.length} test chunks`);
  
  // Ensure text index exists
  try {
    await db.collection('chunks').createIndex({ md_text: 'text' });
    console.log('✅ Text search index ready');
  } catch (error) {
    console.log('ℹ️  Text index already exists');
  }
  
  await client.close();
  return { projectId: TEST_PROJECT_ID, userId: TEST_USER_ID };
}

/**
 * Test the hybrid retrieval system
 */
async function testHybridRetrieval(projectId) {
  console.log('\n🔍 Testing hybrid retrieval...');
  
  try {
    // Import the hybrid retrieval function
    const { hybridRetrieve } = await import('../src/lib/retrieval/hybrid.js');
    
    const result = await hybridRetrieve({
      projectId,
      query: 'productivity automation tool benefits',
      k: 5
    });
    
    console.log(`✅ Retrieved ${result.chunks.length} chunks`);
    console.log(`📄 Context pack length: ${result.contextPack.length} chars`);
    
    if (result.chunks.length > 0) {
      console.log('📊 Top chunk scores:');
      result.chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`  ${i + 1}. Score: ${chunk.score.toFixed(3)} | Source: ${chunk.source} | Text: ${chunk.md_text.substring(0, 80)}...`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Hybrid retrieval test failed:', error.message);
    throw error;
  }
}

/**
 * Test email generation prompt
 */
async function testEmailPrompt(contextPack) {
  console.log('\n🔍 Testing email generation prompt...');
  
  try {
    const { generateEmailPrompt } = await import('../src/lib/llm/prompts/generate.js');
    
    const prompt = generateEmailPrompt({
      angle: 'PAS',
      projectName: 'AI Email Test Project',
      audience: 'Busy professionals struggling with productivity',
      length: 'medium',
      constraints: 'Keep tone conversational and focus on time-saving benefits',
      mustInclude: 'Mention specific statistics and customer testimonials',
      contextPack,
      defaultLink: 'https://example.com/product?utm_source=newsletter'
    });
    
    console.log('✅ Email prompt generated successfully');
    console.log(`📏 Prompt length: ${prompt.length} characters`);
    console.log('📋 Prompt preview:');
    console.log(prompt.substring(0, 300) + '...');
    
    return prompt;
  } catch (error) {
    console.error('❌ Email prompt test failed:', error.message);
    throw error;
  }
}

/**
 * Test OpenAI API call
 */
async function testOpenAIGeneration(prompt) {
  console.log('\n🔍 Testing OpenAI API call...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not found - skipping OpenAI test');
    return null;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }
    
    const data = await jsonResponse();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }
    
    const emailData = JSON.parse(content);
    
    console.log('✅ OpenAI generation successful!');
    console.log('📧 Generated email preview:');
    console.log(`  Subject: ${emailData.subject}`);
    console.log(`  Preheader: ${emailData.preheader}`);
    console.log(`  HTML length: ${emailData.html?.length || 0} chars`);
    console.log(`  Markdown length: ${emailData.md?.length || 0} chars`);
    console.log(`  Text length: ${emailData.txt?.length || 0} chars`);
    
    return emailData;
  } catch (error) {
    console.error('❌ OpenAI generation test failed:', error.message);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanup(projectId, userId) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    await Promise.all([
      db.collection('projects').deleteMany({ _id: projectId }),
      db.collection('chunks').deleteMany({ projectId }),
      db.collection('drafts').deleteMany({ projectId }),
    ]);
    
    console.log('✅ Test data cleaned up');
    await client.close();
  } catch (error) {
    console.error('⚠️  Cleanup failed:', error.message);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Testing AI Email Generation Components\n');
  
  let testData;
  
  try {
    // Setup test data
    testData = await setupTestData();
    
    // Test hybrid retrieval
    const retrievalResult = await testHybridRetrieval(testData.projectId);
    
    // Test prompt generation
    const prompt = await testEmailPrompt(retrievalResult.contextPack);
    
    // Test OpenAI generation
    await testOpenAIGeneration(prompt);
    
    console.log('\n✅ All component tests passed!');
    console.log('\n📋 Next steps to test the full API:');
    console.log('1. Start the Next.js development server: npm run dev');
    console.log('2. Use the test project data:');
    console.log(`   Project ID: ${testData.projectId}`);
    console.log(`   User ID: ${testData.userId}`);
    console.log('3. Test the API endpoint with proper authentication');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (testData && process.argv.includes('--cleanup')) {
      await cleanup(testData.projectId, testData.userId);
    }
  }
}

// Run the test
main().catch(console.error);
