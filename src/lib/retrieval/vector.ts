import { getColl } from '@/lib/db/mongo';
import { Chunk } from '@/lib/schemas/chunk';

/**
 * Vector search result interface
 */
export interface VectorSearchResult {
  chunkId: string;
  score: number;
  md_text: string;
  hpath: string[];
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity score (0-1, where 1 is most similar)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // Handle zero vectors
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform vector similarity search within a project
 * 
 * Retrieves the top-k most similar chunks to the query vector within the specified project.
 * Uses cosine similarity for scoring and returns results sorted by similarity score (highest first).
 * 
 * @param projectId - Project ID to search within
 * @param queryVec - Query vector for similarity comparison
 * @param k - Number of top results to return
 * @returns Promise resolving to array of search results with similarity scores
 * 
 * @example
 * ```typescript
 * const results = await vectorSearch('project-123', queryVector, 5);
 * results.forEach(result => {
 *   console.log(`Score: ${result.score}, Text: ${result.md_text.substring(0, 100)}...`);
 * });
 * ```
 */
export async function vectorSearch(
  projectId: string,
  queryVec: number[],
  k: number,
  userId?: string
): Promise<VectorSearchResult[]> {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  if (!queryVec || queryVec.length === 0) {
    throw new Error('Query vector is required and must not be empty');
  }

  if (k <= 0) {
    throw new Error('k must be a positive integer');
  }

  try {
    // Get chunks collection
    const chunks = await getColl<Chunk>('chunks');

    // Build query filter - include userId if provided for additional security
    const filter: Record<string, unknown> = {
      projectId,
      embedding: { $exists: true, $type: "array" },
      'embedding.0': { $exists: true } // Ensure embedding array is not empty
    };
    
    // Add userId filter if provided (defense in depth)
    if (userId) {
      filter.$or = [
        { userId }, // New chunks with userId field
        { userId: { $exists: false } } // Legacy chunks without userId field
      ];
    }

    // Find all chunks in the project that have embeddings
    const projectChunks = await chunks
      .find(filter)
      .toArray();

    if (projectChunks.length === 0) {
      return [];
    }

    // Calculate similarity scores for all chunks
    const scoredChunks = projectChunks
      .map(chunk => {
        try {
          // Ensure embedding exists and has the correct length
          if (!chunk.embedding || chunk.embedding.length !== queryVec.length) {
            return null;
          }

          const score = cosineSimilarity(queryVec, chunk.embedding);
          
          return {
            chunkId: chunk.chunkId,
            score,
            md_text: chunk.md_text,
            hpath: chunk.meta?.hpath || [],
          };
        } catch (error) {
          // Skip chunks with invalid embeddings
          console.warn(`Skipping chunk ${chunk.chunkId} due to embedding error:`, error);
          return null;
        }
      })
      .filter((result): result is VectorSearchResult => result !== null);

    // Sort by similarity score (highest first) and return top-k
    const topResults = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return topResults;

  } catch (error) {
    throw new Error(
      `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get embedding statistics for a project
 * Useful for debugging and monitoring vector search performance
 * 
 * @param projectId - Project ID to analyze
 * @returns Promise resolving to embedding statistics
 */
export async function getEmbeddingStats(projectId: string): Promise<{
  totalChunks: number;
  chunksWithEmbeddings: number;
  embeddingDimensions: number | null;
  averageTextLength: number;
}> {
  const chunks = await getColl<Chunk>('chunks');

  const [totalChunks, chunksWithEmbeddings] = await Promise.all([
    chunks.countDocuments({ projectId }),
    chunks.countDocuments({
      projectId,
      embedding: { $exists: true, $type: "array" },
      'embedding.0': { $exists: true }
    })
  ]);

  // Get a sample chunk to determine embedding dimensions
  const sampleChunk = await chunks.findOne({
    projectId,
    embedding: { $exists: true, $type: "array" },
    'embedding.0': { $exists: true }
  });

  const embeddingDimensions = sampleChunk?.embedding?.length || null;

  // Calculate average text length
  const pipeline = [
    { $match: { projectId } },
    {
      $group: {
        _id: null,
        avgLength: { $avg: { $strLenCP: '$md_text' } }
      }
    }
  ];

  const [avgResult] = await chunks.aggregate(pipeline).toArray();
  const averageTextLength = Math.round(avgResult?.avgLength || 0);

  return {
    totalChunks,
    chunksWithEmbeddings,
    embeddingDimensions,
    averageTextLength,
  };
}
