import { getColl } from '@/lib/db/mongo';
import { Chunk } from '@/lib/schemas/chunk';

/**
 * Lexical search result interface (matches VectorSearchResult)
 */
export interface LexicalSearchResult {
  chunkId: string;
  score: number;
  md_text: string;
  hpath: string[];
  title?: string;
  tags?: string[];
}

/**
 * Calculate a heuristic relevance score for lexical search results
 * 
 * This function combines MongoDB's text search score with additional
 * heuristics to provide a normalized score between 0-1.
 * 
 * @param textScore - MongoDB text search score
 * @param textLength - Length of the chunk text
 * @param queryTerms - Array of search terms
 * @param chunkText - The actual chunk text
 * @returns Normalized relevance score (0-1)
 */
function calculateHeuristicScore(
  textScore: number,
  textLength: number,
  queryTerms: string[],
  chunkText: string
): number {
  // Base score from MongoDB text search (already relevance-weighted)
  let score = Math.min(textScore, 10) / 10; // Normalize to 0-1 range
  
  // Boost score for exact phrase matches
  const lowerChunkText = chunkText.toLowerCase();
  const exactMatches = queryTerms.filter(term => 
    lowerChunkText.includes(term.toLowerCase())
  ).length;
  
  if (exactMatches > 0) {
    const exactMatchBoost = (exactMatches / queryTerms.length) * 0.2;
    score += exactMatchBoost;
  }
  
  // Slight boost for shorter, more focused chunks
  if (textLength < 500) {
    score += 0.05;
  }
  
  // Ensure score stays within 0-1 range
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Extract search terms from query string
 * 
 * @param query - Search query string
 * @returns Array of normalized search terms
 */
function extractSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2) // Filter out very short terms
    .slice(0, 10); // Limit to first 10 terms to avoid performance issues
}

/**
 * Perform lexical text search within a project using MongoDB text index
 * 
 * This function provides a fallback search mechanism when vector search
 * is not available or appropriate. It uses MongoDB's full-text search
 * capabilities with additional heuristic scoring.
 * 
 * @param projectId - Project ID to search within
 * @param query - Text query to search for
 * @param k - Number of top results to return
 * @returns Promise resolving to array of search results with relevance scores
 * 
 * @example
 * ```typescript
 * const results = await lexicalSearch('project-123', 'machine learning algorithms', 5);
 * results.forEach(result => {
 *   console.log(`Score: ${result.score.toFixed(3)}, Text: ${result.md_text.substring(0, 100)}...`);
 * });
 * ```
 */
export async function lexicalSearch(
  projectId: string,
  query: string,
  k: number,
  userId?: string
): Promise<LexicalSearchResult[]> {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Query is required and must not be empty');
  }

  if (k <= 0) {
    throw new Error('k must be a positive integer');
  }

  try {
    // Get chunks collection
    const chunks = await getColl<Chunk>('chunks');

    // Extract search terms for heuristic scoring
    const queryTerms = extractSearchTerms(query.trim());
    
    if (queryTerms.length === 0) {
      // If no valid search terms, return empty results
      return [];
    }

    // Build search filter - include userId if provided for additional security
    const searchFilter: Record<string, unknown> = {
      projectId,
      $text: { $search: query.trim() }
    };
    
    // Add userId filter if provided (defense in depth)
    if (userId) {
      searchFilter.$and = [
        { $text: { $search: query.trim() } },
        {
          $or: [
            { userId }, // New chunks with userId field
            { userId: { $exists: false } } // Legacy chunks without userId field
          ]
        }
      ];
      delete searchFilter.$text; // Remove duplicate $text from root level
    }

    // Perform MongoDB text search with projection to include text score
    const searchResults = await chunks
      .find(
        searchFilter,
        {
          projection: {
            chunkId: 1,
            md_text: 1,
            meta: 1,
            score: { $meta: 'textScore' }
          }
        }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(k * 2) // Get more results to allow for better heuristic filtering
      .toArray();

    if (searchResults.length === 0) {
      return [];
    }

    // Calculate heuristic scores and format results
    const scoredResults: LexicalSearchResult[] = searchResults.map(chunk => {
      const textScore = (chunk as Record<string, unknown> & { score?: number }).score || 1; // MongoDB text search score
      const heuristicScore = calculateHeuristicScore(
        textScore,
        chunk.md_text.length,
        queryTerms,
        chunk.md_text
      );

      return {
        chunkId: chunk.chunkId,
        score: heuristicScore,
        md_text: chunk.md_text,
        hpath: chunk.meta?.hpath || [],
        title: chunk.title,
        tags: chunk.tags,
      };
    });

    // Sort by heuristic score (highest first) and return top-k
    const topResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return topResults;

  } catch (error) {
    throw new Error(
      `Lexical search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get lexical search statistics for a project
 * Useful for debugging and monitoring text search performance
 * 
 * @param projectId - Project ID to analyze
 * @returns Promise resolving to lexical search statistics
 */
export async function getLexicalSearchStats(projectId: string): Promise<{
  totalChunks: number;
  averageTextLength: number;
  hasTextIndex: boolean;
}> {
  const chunks = await getColl<Chunk>('chunks');

  // Count total chunks in project
  const totalChunks = await chunks.countDocuments({ projectId });

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

  // Check if text index exists
  let hasTextIndex = false;
  try {
    const indexes = await chunks.listIndexes().toArray();
    hasTextIndex = indexes.some(index => 
      index.key && typeof index.key.md_text === 'string' && index.key.md_text === 'text'
    );
  } catch (error) {
    console.warn('Could not check for text index:', error);
  }

  return {
    totalChunks,
    averageTextLength,
    hasTextIndex,
  };
}
