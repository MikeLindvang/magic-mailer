#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * 
 * Checks that all required environment variables are set for the Magic Mailer application
 * to function properly, especially for the asset upload flow.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  // Authentication (Clerk)
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': {
    description: 'Clerk publishable key for authentication',
    required: true,
    example: 'pk_test_...'
  },
  'CLERK_SECRET_KEY': {
    description: 'Clerk secret key for server-side authentication',
    required: true,
    example: 'sk_test_...'
  },
  
  // Database (MongoDB)
  'MONGODB_URI': {
    description: 'MongoDB connection string',
    required: true,
    example: 'mongodb://localhost:27017/magic-mailer'
  },
  
  // AI/ML (OpenAI)
  'OPENAI_API_KEY': {
    description: 'OpenAI API key for embeddings and content generation',
    required: true,
    example: 'sk-...'
  },
  
  // Optional configuration
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL': {
    description: 'Custom sign-in URL',
    required: false,
    example: '/sign-in'
  },
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL': {
    description: 'Custom sign-up URL',
    required: false,
    example: '/sign-up'
  },
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL': {
    description: 'Redirect URL after sign-in',
    required: false,
    example: '/projects'
  },
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL': {
    description: 'Redirect URL after sign-up',
    required: false,
    example: '/projects'
  }
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(name, config) {
  const value = process.env[name];
  const isSet = value !== undefined && value !== '';
  
  console.log(`${isSet ? '✅' : (config.required ? '❌' : '⚠️ ')} ${name}`);
  
  if (!isSet && config.required) {
    console.log(`   ❌ MISSING: ${config.description}`);
    console.log(`   💡 Example: ${config.example}`);
    return false;
  } else if (!isSet && !config.required) {
    console.log(`   ⚠️  Optional: ${config.description}`);
    console.log(`   💡 Example: ${config.example}`);
    return true;
  } else {
    console.log(`   ✅ Set: ${config.description}`);
    
    // Additional validation for specific variables
    if (name === 'MONGODB_URI' && !value.startsWith('mongodb')) {
      console.log(`   ⚠️  Warning: MongoDB URI should start with 'mongodb://' or 'mongodb+srv://'`);
    }
    
    if (name === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
      console.log(`   ⚠️  Warning: OpenAI API key should start with 'sk-'`);
    }
    
    return true;
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  console.log('\n🧪 Testing Database Connection...');
  
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('❌ Cannot test database connection: MONGODB_URI not set');
    return false;
  }
  
  try {
    // Dynamic import to avoid issues if mongodb is not installed
    const { MongoClient } = await import('mongodb');
    
    const client = new MongoClient(mongoUri);
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAIConnection() {
  console.log('\n🧪 Testing OpenAI API Connection...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ Cannot test OpenAI connection: OPENAI_API_KEY not set');
    return false;
  }
  
  try {
    // Dynamic import to avoid issues if openai is not installed
    const OpenAI = await import('openai');
    
    const openai = new OpenAI.default({
      apiKey: apiKey,
    });
    
    // Test with a simple embedding request
    await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    
    console.log('✅ OpenAI API connection successful');
    return true;
  } catch (error) {
    console.log('❌ OpenAI API connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyEnvironment() {
  console.log('🔍 Magic Mailer Environment Verification');
  console.log('=========================================\n');
  
  console.log('📋 Checking Environment Variables:');
  
  let allValid = true;
  let requiredCount = 0;
  let setCount = 0;
  
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const isValid = validateEnvVar(name, config);
    
    if (config.required) {
      requiredCount++;
      if (isValid && process.env[name]) {
        setCount++;
      }
    }
    
    if (config.required && !isValid) {
      allValid = false;
    }
  }
  
  console.log(`\n📊 Summary: ${setCount}/${requiredCount} required variables set`);
  
  if (!allValid) {
    console.log('\n❌ Environment setup incomplete. Please set the missing required variables.');
    console.log('\n💡 Create a .env.local file in the project root with the required variables.');
    console.log('   See CLERK_SETUP.md for detailed instructions.');
    return false;
  }
  
  console.log('\n✅ All required environment variables are set!');
  
  // Test connections if all required vars are set
  const dbConnected = await testDatabaseConnection();
  const openaiConnected = await testOpenAIConnection();
  
  console.log('\n🎯 Final Status:');
  console.log(`   Environment Variables: ✅ Complete`);
  console.log(`   Database Connection: ${dbConnected ? '✅ Working' : '❌ Failed'}`);
  console.log(`   OpenAI API Connection: ${openaiConnected ? '✅ Working' : '❌ Failed'}`);
  
  const allSystemsGo = allValid && dbConnected && openaiConnected;
  
  if (allSystemsGo) {
    console.log('\n🚀 All systems go! Your Magic Mailer setup is ready.');
  } else {
    console.log('\n⚠️  Some systems need attention before running the application.');
  }
  
  return allSystemsGo;
}

/**
 * Usage instructions
 */
function showUsage() {
  console.log(`
📖 Environment Setup Instructions:

1. Copy the example environment file:
   cp .env.example .env.local

2. Edit .env.local and fill in your values:
   - Get Clerk keys from: https://dashboard.clerk.com/
   - Set up MongoDB (local or cloud)
   - Get OpenAI API key from: https://platform.openai.com/

3. Run this verification script:
   node scripts/verify-env.js

4. If all checks pass, start the development server:
   npm run dev

For detailed setup instructions, see CLERK_SETUP.md
`);
}

// Run verification if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    verifyEnvironment().catch(console.error);
  }
}

export { verifyEnvironment };