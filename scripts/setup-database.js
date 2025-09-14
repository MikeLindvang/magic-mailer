/**
 * Database Setup Script for Magic Mailer
 * 
 * This script ensures the database is properly configured with:
 * - Required indexes for optimal performance
 * - Sample data for testing (optional)
 * 
 * Run with: node scripts/setup-database.js
 */

import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
// Note: This import may need adjustment based on your build setup
// For now, we'll implement the index creation directly
// import { ensureIndexes } from '../src/lib/db/indexes.js';

// Load environment variables
config({ path: '.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function header(message) {
  log(`\n${colors.bold}=== ${message} ===${colors.reset}`, colors.blue);
}

/**
 * Setup database indexes
 */
async function setupIndexes(db) {
  const indexes = [
    // Chunks collection indexes
    {
      collection: 'chunks',
      index: { projectId: 1 },
      options: { name: 'chunks_projectId_1', background: true }
    },
    {
      collection: 'chunks',
      index: { assetId: 1 },
      options: { name: 'chunks_assetId_1', background: true }
    },
    {
      collection: 'chunks',
      index: { md_text: 'text' },
      options: { 
        name: 'chunks_md_text_text',
        background: true
      }
    },
    // Assets collection indexes
    {
      collection: 'assets',
      index: { projectId: 1 },
      options: { name: 'assets_projectId_1', background: true }
    },
    // Drafts collection indexes
    {
      collection: 'drafts',
      index: { projectId: 1 },
      options: { name: 'drafts_projectId_1', background: true }
    },
    // Projects collection indexes
    {
      collection: 'projects',
      index: { userId: 1 },
      options: { name: 'projects_userId_1', background: true }
    }
  ];

  for (const indexSpec of indexes) {
    const collection = db.collection(indexSpec.collection);
    
    try {
      // Check if index already exists
      const existingIndexes = await collection.listIndexes().toArray();
      const indexExists = existingIndexes.some(
        idx => idx.name === indexSpec.options?.name
      );
      
      if (!indexExists) {
        info(`Creating index ${indexSpec.options?.name} on ${indexSpec.collection}`);
        await collection.createIndex(indexSpec.index, indexSpec.options);
        success(`Index ${indexSpec.options?.name} created`);
      } else {
        success(`Index ${indexSpec.options?.name} already exists`);
      }
    } catch (error) {
      error(`Failed to create index ${indexSpec.options?.name} on ${indexSpec.collection}: ${error.message}`);
    }
  }
}

async function setupDatabase() {
  header('Magic Mailer Database Setup');

  // Check environment variables
  if (!process.env.MONGODB_URI) {
    error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  let client;
  try {
    // Connect to MongoDB
    info('Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    success('Connected to MongoDB');

    const dbName = process.env.MONGODB_DB_NAME || 'magicmailer';
    const db = client.db(dbName);
    
    info(`Using database: ${dbName}`);

    // Test database access
    header('Testing Database Access');
    const collections = await db.listCollections().toArray();
    success(`Found ${collections.length} existing collections`);
    
    collections.forEach(col => {
      info(`  - ${col.name}`);
    });

    // Setup indexes
    header('Setting Up Database Indexes');
    try {
      await setupIndexes(db);
      success('Database indexes configured successfully');
    } catch (indexError) {
      error(`Failed to setup indexes: ${indexError.message}`);
      throw indexError;
    }

    // Verify collections exist (create if needed)
    header('Verifying Collections');
    const requiredCollections = ['projects', 'assets', 'chunks', 'drafts'];
    
    for (const collectionName of requiredCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        success(`Collection '${collectionName}': ${count} documents`);
      } catch (colError) {
        info(`Creating collection '${collectionName}'`);
        await db.createCollection(collectionName);
        success(`Collection '${collectionName}' created`);
      }
    }

    // Database health check
    header('Database Health Check');
    const stats = await db.stats();
    info(`Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    info(`Total collections: ${stats.collections}`);
    info(`Total indexes: ${stats.indexes}`);

    success('Database setup completed successfully!');

  } catch (err) {
    error(`Database setup failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      info('Database connection closed');
    }
  }
}

// Run setup if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase().catch(console.error);
}

export { setupDatabase };
