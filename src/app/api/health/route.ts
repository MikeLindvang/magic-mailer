import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/mongo';
import { ensureIndexes } from '@/lib/db/indexes';

export async function GET() {
  try {
    // Connect to MongoDB and list collections
    const db = await getDb();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    // Ensure database indexes are created
    await ensureIndexes();

    return NextResponse.json({
      ok: true,
      data: {
        collections: collectionNames,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Database connection failed',
      },
      { status: 500 }
    );
  }
}
