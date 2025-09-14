// Health check endpoint
import { getDb } from '@/lib/db/mongo';
import { ensureIndexes } from '@/lib/db/indexes';
import { jsonResponse } from '@/lib/api/response';

export async function GET() {
  try {
    // Connect to MongoDB and list collections
    const db = await getDb();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    // Ensure database indexes are created
    await ensureIndexes();

    return jsonResponse({
      ok: true,
      data: {
        collections: collectionNames,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Database connection failed',
      },
      { status: 500 }
    );
  }
}
