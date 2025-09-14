#!/usr/bin/env node

/**
 * End-to-end test script for AI email generation feature
 * Tests the complete flow: project setup → asset ingestion → email generation
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'OPENAI_API_KEY',
  'CLERK_SECRET_KEY'
];

const TEST_PROJECT_NAME = 'AI Email Test Project';
const TEST_USER_ID = 'test_user_' + nanoid(8);

/**
 * Check environment variables
 */
function checkEnvironment() {
  console.log('🔍 Checking environment variables...');
  
  const missing = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.log('Please ensure your .env.local file contains:');
    missing.forEach(envVar => console.log(`  ${envVar}=your_value_here`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables found');
  return true;
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  console.log('\n🔍 Testing database connection...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    // Test basic operations
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`✅ Connected to MongoDB. Found ${collections.length} collections.`);
    
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAIConnection() {
  console.log('\n🔍 Testing OpenAI API connection...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await jsonResponse();
    const hasGpt4Mini = data.data.some(model => model.id === 'gpt-4o-mini');
    
    console.log(`✅ OpenAI API connected. GPT-4o-mini available: ${hasGpt4Mini}`);
    return true;
  } catch (error) {
    console.error('❌ OpenAI API connection failed:', error.message);
    return false;
  }
}

/**
 * Create a test project with sample assets
 */
async function createTestProject() {
  console.log('\n🔍 Creating test project...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Create test project
    const projectId = nanoid();
    const now = new Date().toISOString();
    
    const project = {
      _id: projectId,
      name: TEST_PROJECT_NAME,
      description: 'Test project for AI email generation',
      status: 'active',
      userId: TEST_USER_ID,
      default_link: 'https://example.com/test-product',
      createdAt: now,
      updatedAt: now,
    };
    
    await db.collection('projects').insertOne(project);
    console.log(`✅ Created test project: ${projectId}`);
    
    // Create sample chunks with embeddings
    const sampleChunks = [
      {
        chunkId: nanoid(),
        projectId,
        md_text: `# Product Features\n\nOur revolutionary productivity tool helps users save 5+ hours per week by automating repetitive tasks. Key features include:\n\n- Smart automation workflows\n- Real-time collaboration\n- Advanced analytics dashboard\n- Integration with 50+ popular tools`,
        meta: {
          hpath: ['Product Features'],
          source: 'product-doc.md'
        },
        embedding: null, // Will be generated
        createdAt: now
      },
      {
        chunkId: nanoid(),
        projectId,
        md_text: `# Customer Pain Points\n\nResearch shows that 78% of knowledge workers spend 2-3 hours daily on manual, repetitive tasks that could be automated. This leads to:\n\n- Decreased productivity and job satisfaction\n- Increased risk of human error\n- Burnout and stress from mundane work\n- Lost opportunities for creative problem-solving`,
        meta: {
          hpath: ['Customer Research', 'Pain Points'],
          source: 'research.md'
        },
        embedding: null,
        createdAt: now
      },
      {
        chunkId: nanoid(),
        projectId,
        md_text: `# Success Stories\n\nOur beta users have seen incredible results:\n\n"Since implementing this tool, our team productivity increased by 40% and employee satisfaction scores improved dramatically." - Sarah Johnson, Operations Manager\n\n"The automation features saved us 15 hours per week, allowing us to focus on strategic initiatives." - Mike Chen, Startup Founder`,
        meta: {
          hpath: ['Testimonials', 'Success Stories'],
          source: 'testimonials.md'
        },
        embedding: null,
        createdAt: now
      }
    ];
    
    // Generate embeddings for sample chunks
    console.log('📊 Generating embeddings for sample chunks...');
    
    const texts = sampleChunks.map(chunk => chunk.md_text);
    const embeddings = await generateEmbeddings(texts);
    
    // Add embeddings to chunks
    sampleChunks.forEach((chunk, index) => {
      chunk.embedding = embeddings[index];
    });
    
    await db.collection('chunks').insertMany(sampleChunks);
    console.log(`✅ Created ${sampleChunks.length} sample chunks with embeddings`);
    
    // Create text index for lexical search
    try {
      await db.collection('chunks').createIndex({ md_text: 'text' });
      console.log('✅ Created text search index');
    } catch (error) {
      console.log('ℹ️  Text index may already exist:', error.message);
    }
    
    await client.close();
    return { projectId, userId: TEST_USER_ID };
  } catch (error) {
    console.error('❌ Failed to create test project:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbeddings(texts) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.status}`);
  }
  
  const data = await jsonResponse();
  return data.data.map(item => item.embedding);
}

/**
 * Test the email generation API endpoint
 */
async function testEmailGeneration(projectId, userId) {
  console.log('\n🔍 Testing email generation API...');
  
  try {
    const requestBody = {
      projectId,
      angle: 'PAS',
      audience: 'Busy professionals who struggle with productivity',
      length: 'medium',
      constraints: 'Keep tone conversational and focus on time-saving benefits',
      mustInclude: 'Include specific time savings statistics',
      query: 'productivity automation tool features'
    };
    
    console.log('📤 Sending request to /api/generate...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Simulate API call (since we can't easily mock Clerk auth in this script)
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real testing, you'd need proper Clerk authentication
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:', errorText);
      return false;
    }
    
    const result = await jsonResponse();
    
    if (result.ok) {
      console.log('✅ Email generation successful!');
      console.log('📧 Generated email preview:');
      console.log(`  Subject: ${result.data.draft.subject}`);
      console.log(`  Preheader: ${result.data.draft.preheader}`);
      console.log(`  Context chunks used: ${result.data.contextChunks.length}`);
      console.log(`  HTML length: ${result.data.draft.formats.html.length} chars`);
      console.log(`  Markdown length: ${result.data.draft.formats.md.length} chars`);
      
      return result.data;
    } else {
      console.error('❌ API returned error:', result.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Email generation test failed:', error.message);
    return false;
  }
}

/**
 * Test hybrid retrieval system directly
 */
async function testHybridRetrieval(projectId) {
  console.log('\n🔍 Testing hybrid retrieval system...');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Test vector search data
    const chunksWithEmbeddings = await db.collection('chunks')
      .countDocuments({ 
        projectId, 
        embedding: { $exists: true, $ne: null } 
      });
    
    console.log(`📊 Chunks with embeddings: ${chunksWithEmbeddings}`);
    
    // Test lexical search index
    const indexes = await db.collection('chunks').listIndexes().toArray();
    const hasTextIndex = indexes.some(index => 
      index.key && index.key.md_text === 'text'
    );
    
    console.log(`📊 Text search index available: ${hasTextIndex}`);
    
    if (chunksWithEmbeddings > 0 && hasTextIndex) {
      console.log('✅ Hybrid retrieval system is properly configured');
      return true;
    } else {
      console.log('⚠️  Hybrid retrieval system has missing components');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Hybrid retrieval test failed:', error.message);
    return false;
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
    
    // Remove test project and related data
    await Promise.all([
      db.collection('projects').deleteMany({ userId }),
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
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting AI Email Generation End-to-End Test\n');
  
  let projectId, userId;
  
  try {
    // Step 1: Environment check
    checkEnvironment();
    
    // Step 2: Test external connections
    const dbConnected = await testDatabaseConnection();
    const openaiConnected = await testOpenAIConnection();
    
    if (!dbConnected || !openaiConnected) {
      console.error('\n❌ Prerequisites failed. Cannot continue with tests.');
      process.exit(1);
    }
    
    // Step 3: Create test project and data
    const testData = await createTestProject();
    projectId = testData.projectId;
    userId = testData.userId;
    
    // Step 4: Test hybrid retrieval
    await testHybridRetrieval(projectId);
    
    // Step 5: Test email generation
    console.log('\n⚠️  Note: Email generation API test requires running Next.js server');
    console.log('   Run "npm run dev" in another terminal, then:');
    console.log(`   curl -X POST http://localhost:3000/api/generate \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"projectId":"${projectId}","angle":"PAS","query":"productivity tool"}'`);
    
    console.log('\n✅ End-to-end test setup completed successfully!');
    console.log(`   Test Project ID: ${projectId}`);
    console.log(`   Test User ID: ${userId}`);
    console.log('\n   To clean up test data, run this script with --cleanup flag');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup if requested
    if (process.argv.includes('--cleanup') && projectId && userId) {
      await cleanup(projectId, userId);
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
