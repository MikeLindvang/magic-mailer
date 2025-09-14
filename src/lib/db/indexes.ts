import { getDb } from './mongo';

/**
 * Database indexes configuration and management
 * 
 * This module ensures all required MongoDB indexes are created for optimal
 * query performance across the application's collections.
 */

interface IndexSpec {
  collection: string;
  index: Record<string, 1 | -1 | 'text'>;
  options?: {
    name?: string;
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
  };
}

/**
 * Index specifications for all collections
 */
const INDEXES: IndexSpec[] = [
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
];

/**
 * Ensure all required database indexes exist
 * 
 * This function creates indexes if they don't exist and is safe to call
 * multiple times. Indexes are created in the background to minimize
 * performance impact.
 * 
 * @returns Promise<void>
 */
export async function ensureIndexes(): Promise<void> {
  try {
    const db = await getDb();
    
    console.log('🔍 Ensuring database indexes...');
    
    for (const indexSpec of INDEXES) {
      const collection = db.collection(indexSpec.collection);
      
      try {
        // Check if index already exists
        const existingIndexes = await collection.listIndexes().toArray();
        const indexExists = existingIndexes.some(
          idx => idx.name === indexSpec.options?.name
        );
        
        if (!indexExists) {
          console.log(`📝 Creating index ${indexSpec.options?.name} on ${indexSpec.collection}`);
          await collection.createIndex(indexSpec.index, indexSpec.options);
        } else {
          console.log(`✅ Index ${indexSpec.options?.name} already exists on ${indexSpec.collection}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create index ${indexSpec.options?.name} on ${indexSpec.collection}:`, error);
        // Continue with other indexes even if one fails
      }
    }
    
    console.log('✅ Database indexes ensured successfully');
  } catch (error) {
    console.error('❌ Failed to ensure database indexes:', error);
    throw error;
  }
}

/**
 * List all indexes for a specific collection
 * 
 * @param collectionName - Name of the collection
 * @returns Promise<any[]> - Array of index information
 */
export async function listIndexes(collectionName: string): Promise<Record<string, unknown>[]> {
  try {
    const db = await getDb();
    const collection = db.collection(collectionName);
    return await collection.listIndexes().toArray();
  } catch (error) {
    console.error(`Failed to list indexes for collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Drop a specific index from a collection
 * 
 * @param collectionName - Name of the collection
 * @param indexName - Name of the index to drop
 * @returns Promise<void>
 */
export async function dropIndex(collectionName: string, indexName: string): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection(collectionName);
    await collection.dropIndex(indexName);
    console.log(`🗑️ Dropped index ${indexName} from ${collectionName}`);
  } catch (error) {
    console.error(`Failed to drop index ${indexName} from ${collectionName}:`, error);
    throw error;
  }
}
