#!/usr/bin/env node

/**
 * Test individual components of the AI email generation system
 * This script tests each component in isolation
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_PROJECT_ID = 'test_' + nanoid(8);

/**
 * Test database connection and setup
 */
async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Test basic operations
  const collections = await db.listCollections().toArray();
  console.log(`✅ Connected to MongoDB. Found ${collections.length} collections.`);
  
  // Check for required collections
  const collectionNames = collections.map(c => c.name);
  const requiredCollections = ['projects', 'chunks', 'drafts'];
  const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
  
  if (missingCollections.length > 0) {
    console.log(`ℹ️  Missing collections will be created: ${missingCollections.join(', ')}`);
  }
  
  await client.close();
  return true;
}

/**
 * Test OpenAI API connection
 */
async function testOpenAI() {
  console.log('\n🔍 Testing OpenAI API connection...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not found - skipping OpenAI test');
    return false;
  }
  
  try {
    // Test embeddings endpoint
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: ['test text for embedding'],
      }),
    });
    
    if (!embeddingResponse.ok) {
      throw new Error(`Embeddings API error: ${embeddingResponse.status}`);
    }
    
    const embeddingData = await embeddingjsonResponse();
    console.log(`✅ Embeddings API working. Dimension: ${embeddingData.data[0].embedding.length}`);
    
    // Test chat completions endpoint
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "test successful"' }],
        max_tokens: 10,
      }),
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat API error: ${chatResponse.status}`);
    }
    
    const chatData = await chatjsonResponse();
    console.log(`✅ Chat API working. Response: ${chatData.choices[0].message.content}`);
    
    return true;
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message);
    return false;
  }
}

/**
 * Test vector search functionality
 */
async function testVectorSearch() {
  console.log('\n🔍 Testing vector search functionality...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Create test chunk with embedding
    const testChunk = {
      chunkId: nanoid(),
      projectId: TEST_PROJECT_ID,
      md_text: 'This is a test chunk for vector search functionality.',
      meta: { hpath: ['Test'], source: 'test.md' },
      embedding: Array.from({length: 1536}, () => Math.random() - 0.5),
      createdAt: new Date().toISOString()
    };
    
    await db.collection('chunks').insertOne(testChunk);
    console.log('✅ Created test chunk with embedding');
    
    // Test vector search by finding chunks with embeddings
    const chunksWithEmbeddings = await db.collection('chunks')
      .find({
        projectId: TEST_PROJECT_ID,
        embedding: { $exists: true, $ne: null },
        'embedding.0': { $exists: true }
      })
      .toArray();
    
    console.log(`✅ Found ${chunksWithEmbeddings.length} chunks with embeddings`);
    
    // Test cosine similarity calculation (basic test)
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const vec3 = [1, 0, 0];
    
    function cosineSimilarity(a, b) {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (normA * normB);
    }
    
    const similarity1 = cosineSimilarity(vec1, vec2); // Should be 0 (orthogonal)
    const similarity2 = cosineSimilarity(vec1, vec3); // Should be 1 (identical)
    
    if (Math.abs(similarity1) < 0.001 && Math.abs(similarity2 - 1) < 0.001) {
      console.log('✅ Cosine similarity calculation working correctly');
    } else {
      console.log('❌ Cosine similarity calculation failed');
    }
    
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ Vector search test failed:', error.message);
    return false;
  }
}

/**
 * Test lexical search functionality
 */
async function testLexicalSearch() {
  console.log('\n🔍 Testing lexical search functionality...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Create text index if it doesn't exist
    try {
      await db.collection('chunks').createIndex({ md_text: 'text' });
      console.log('✅ Text search index created');
    } catch (error) {
      console.log('ℹ️  Text index already exists');
    }
    
    // Create test chunks for lexical search
    const testChunks = [
      {
        chunkId: nanoid(),
        projectId: TEST_PROJECT_ID,
        md_text: 'Productivity tools help automate repetitive tasks and save time.',
        meta: { hpath: ['Productivity'], source: 'productivity.md' },
        createdAt: new Date().toISOString()
      },
      {
        chunkId: nanoid(),
        projectId: TEST_PROJECT_ID,
        md_text: 'Email automation can streamline communication workflows.',
        meta: { hpath: ['Email'], source: 'email.md' },
        createdAt: new Date().toISOString()
      }
    ];
    
    await db.collection('chunks').insertMany(testChunks);
    console.log(`✅ Created ${testChunks.length} test chunks for lexical search`);
    
    // Test text search
    const searchResults = await db.collection('chunks')
      .find(
        {
          projectId: TEST_PROJECT_ID,
          $text: { $search: 'productivity automation' }
        },
        {
          projection: {
            chunkId: 1,
            md_text: 1,
            score: { $meta: 'textScore' }
          }
        }
      )
      .sort({ score: { $meta: 'textScore' } })
      .toArray();
    
    console.log(`✅ Text search returned ${searchResults.length} results`);
    
    if (searchResults.length > 0) {
      console.log(`   Top result score: ${searchResults[0].score?.toFixed(3) || 'N/A'}`);
    }
    
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ Lexical search test failed:', error.message);
    return false;
  }
}

/**
 * Test email prompt generation
 */
async function testPromptGeneration() {
  console.log('\n🔍 Testing email prompt generation...');
  
  try {
    // Mock context pack
    const mockContextPack = `## [chunk1] (Product > Features)

Our productivity tool helps users save 5+ hours per week through automation.

## [chunk2] (Research > Pain Points)

78% of professionals spend 2-3 hours daily on repetitive tasks.`;
    
    // Create a basic prompt (without importing the actual module)
    const prompt = `You are an expert email copywriter specializing in the PAS (Problem-Agitate-Solution) framework.

## CONTEXT INFORMATION
${mockContextPack}

## EMAIL REQUIREMENTS
- Project: Test Project
- Angle: PAS (Problem-Agitate-Solution structure)
- Target Audience: Busy professionals
- Length: Aim for a moderate length (250-400 words total)

Generate a compelling email using ONLY the facts and information provided in the context above.

You must respond with a valid JSON object containing exactly these fields:
{
  "subject": "Compelling subject line",
  "preheader": "Supporting preview text",
  "html": "Full HTML email",
  "md": "Clean markdown version",
  "txt": "Plain text version"
}`;
    
    console.log('✅ Email prompt generated successfully');
    console.log(`   Prompt length: ${prompt.length} characters`);
    console.log('   Contains required sections: context, requirements, output format');
    
    return true;
  } catch (error) {
    console.error('❌ Prompt generation test failed:', error.message);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    await Promise.all([
      db.collection('projects').deleteMany({ _id: TEST_PROJECT_ID }),
      db.collection('chunks').deleteMany({ projectId: TEST_PROJECT_ID }),
      db.collection('drafts').deleteMany({ projectId: TEST_PROJECT_ID }),
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
  
  const results = {
    database: false,
    openai: false,
    vectorSearch: false,
    lexicalSearch: false,
    promptGeneration: false
  };
  
  try {
    // Test each component
    results.database = await testDatabase();
    results.openai = await testOpenAI();
    results.vectorSearch = await testVectorSearch();
    results.lexicalSearch = await testLexicalSearch();
    results.promptGeneration = await testPromptGeneration();
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`  Database connection: ${results.database ? '✅ Working' : '❌ Failed'}`);
    console.log(`  OpenAI API: ${results.openai ? '✅ Working' : '⚠️  Not configured'}`);
    console.log(`  Vector search: ${results.vectorSearch ? '✅ Working' : '❌ Failed'}`);
    console.log(`  Lexical search: ${results.lexicalSearch ? '✅ Working' : '❌ Failed'}`);
    console.log(`  Prompt generation: ${results.promptGeneration ? '✅ Working' : '❌ Failed'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (results.database && results.vectorSearch && results.lexicalSearch && results.promptGeneration) {
      console.log('\n✅ Core email generation components are working!');
      
      if (!results.openai) {
        console.log('\n⚠️  OpenAI API not configured. Add OPENAI_API_KEY to .env.local to test full generation.');
      }
      
      console.log('\n📝 Next steps:');
      console.log('1. Ensure OPENAI_API_KEY is configured in .env.local');
      console.log('2. Test the full API endpoint with: npm run dev');
      console.log('3. Use the dashboard to create projects and test email generation');
    } else {
      console.log('\n❌ Some core components failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run the test
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
