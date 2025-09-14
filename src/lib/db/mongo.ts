import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Get the MongoDB database instance
 * Uses the database name from the connection string or defaults to 'magic-mailer'
 * 
 * @returns Promise<Db> - MongoDB database instance
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  
  // Extract database name from URI or use default
  const dbName = process.env.MONGODB_DB_NAME || 'magic-mailer';
  
  return client.db(dbName);
}

/**
 * Get a typed MongoDB collection
 * 
 * @param name - Collection name
 * @returns Promise<Collection<T>> - Typed MongoDB collection
 * 
 * @example
 * ```typescript
 * interface User {
 *   _id?: ObjectId;
 *   email: string;
 *   name: string;
 *   createdAt: Date;
 * }
 * 
 * const users = await getColl<User>('users');
 * const user = await users.findOne({ email: 'user@example.com' });
 * ```
 */
export async function getColl<T = Record<string, unknown>>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Get the raw MongoDB client instance
 * Use this only when you need direct client access for advanced operations
 * 
 * @returns Promise<MongoClient> - MongoDB client instance
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

// Export the client promise for compatibility with existing patterns
export default clientPromise;
