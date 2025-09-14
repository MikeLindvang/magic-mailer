import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { embedMany } from '@/lib/vector/embeddings';
import { Chunk } from '@/lib/schemas/chunk';

// Request schema validation
const IndexRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

/**
 * POST /api/index
 * 
 * Index non-vector chunks for a project by generating embeddings
 * and updating the chunks with their vectors.
 * 
 * Request body:
 * {
 *   "projectId": "string"
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "indexed": number
 *   }
 * }
 */
export async function POST(request: Request) {
  const authResult = await requireUser();
  
  if (!authResult.ok) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const { projectId } = IndexRequestSchema.parse(body);

    // Get chunks collection
    const chunksCollection = await getColl<Chunk>('chunks');

    // Verify project ownership and find non-vector chunks
    const nonVectorChunks = await chunksCollection.find({
      projectId,
      userId, // Ensure user can only index their own project's chunks
      $or: [
        { vector: false },
        { vector: { $exists: false } }
      ]
    }).toArray();

    if (nonVectorChunks.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          indexed: 0,
        },
      });
    }

    // Extract text content for embedding
    const textsToEmbed = nonVectorChunks.map(chunk => chunk.md_text);
    const chunkIds = nonVectorChunks.map(chunk => chunk._id);

    // Generate embeddings for all non-vector chunks
    const embeddings = await embedMany(textsToEmbed);

    if (embeddings.length !== nonVectorChunks.length) {
      throw new Error('Mismatch between number of chunks and embeddings generated');
    }

    // Update chunks with their embeddings and set vector: true
    const bulkOps = chunkIds.map((chunkId, index) => ({
      updateOne: {
        filter: { _id: chunkId, projectId, userId },
        update: {
          $set: {
            embedding: embeddings[index],
            vector: true,
            updatedAt: new Date(),
          },
        },
      },
    }));

    // Execute bulk update
    const bulkResult = await chunksCollection.bulkWrite(bulkOps);

    // Verify all updates were successful
    if (bulkResult.modifiedCount !== nonVectorChunks.length) {
      console.warn(
        `Expected to update ${nonVectorChunks.length} chunks, but only updated ${bulkResult.modifiedCount}`
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        indexed: bulkResult.modifiedCount,
      },
    });

  } catch (error) {
    console.error('Index API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          ok: false, 
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to index chunks' 
      },
      { status: 500 }
    );
  }
}
