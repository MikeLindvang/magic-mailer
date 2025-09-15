import { vectorSearch, VectorSearchResult } from './vector';
import { lexicalSearch, LexicalSearchResult } from './lexical';
import { embedMany } from '@/lib/vector/embeddings';

/**
 * Combined search result with merged scoring
 */
export interface HybridSearchResult {
  chunkId: string;
  score: number;
  md_text: string;
  hpath: string[];
  source: 'vector' | 'lexical' | 'both';
}

/**
 * Hybrid retrieval response
 */
export interface HybridRetrievalResponse {
  chunks: HybridSearchResult[];
  contextPack: string;
}

/**
 * Normalize scores to 0-1 range using min-max normalization
 * 
 * @param results - Array of results with scores
 * @returns Array of results with normalized scores
 */
function normalizeScores<T extends { score: number }>(results: T[]): T[] {
  if (results.length === 0) return results;
  
  const scores = results.map(r => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  
  // If all scores are the same, return as-is
  if (maxScore === minScore) {
    return results.map(r => ({ ...r, score: 1 }));
  }
  
  // Min-max normalization to 0-1 range
  return results.map(r => ({
    ...r,
    score: (r.score - minScore) / (maxScore - minScore)
  }));
}

/**
 * Merge and deduplicate search results from vector and lexical search
 * 
 * @param vectorResults - Results from vector search
 * @param lexicalResults - Results from lexical search
 * @param k - Maximum number of results to return
 * @returns Merged and deduplicated results
 */
function mergeResults(
  vectorResults: VectorSearchResult[],
  lexicalResults: LexicalSearchResult[],
  k: number
): HybridSearchResult[] {
  // Normalize scores for both result sets
  const normalizedVector = normalizeScores(vectorResults);
  const normalizedLexical = normalizeScores(lexicalResults);
  
  // Create a map to track chunks and their best scores
  const chunkMap = new Map<string, HybridSearchResult>();
  
  // Process vector results
  normalizedVector.forEach(result => {
    chunkMap.set(result.chunkId, {
      chunkId: result.chunkId,
      score: result.score * 0.6, // Weight vector search at 60%
      md_text: result.md_text,
      hpath: result.hpath,
      source: 'vector'
    });
  });
  
  // Process lexical results and merge with vector results
  normalizedLexical.forEach(result => {
    const existing = chunkMap.get(result.chunkId);
    
    if (existing) {
      // Chunk found in both searches - combine scores
      chunkMap.set(result.chunkId, {
        ...existing,
        score: existing.score + (result.score * 0.4), // Weight lexical at 40%
        source: 'both'
      });
    } else {
      // Chunk only found in lexical search
      chunkMap.set(result.chunkId, {
        chunkId: result.chunkId,
        score: result.score * 0.4, // Weight lexical at 40%
        md_text: result.md_text,
        hpath: result.hpath,
        source: 'lexical'
      });
    }
  });
  
  // Convert map to array, sort by score, and slice to k
  return Array.from(chunkMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Build context pack string with chunk headers
 * 
 * @param chunks - Array of chunks to include in context pack
 * @returns Formatted context pack string
 */
function buildContextPack(chunks: HybridSearchResult[]): string {
  if (chunks.length === 0) {
    return '';
  }
  
  return chunks
    .map(chunk => {
      // Create hierarchical path display if hpath exists
      const pathDisplay = chunk.hpath.length > 0 
        ? ` (${chunk.hpath.join(' > ')})` 
        : '';
      
      return `## [${chunk.chunkId}]${pathDisplay}\n\n${chunk.md_text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Perform hybrid retrieval combining vector and lexical search
 * 
 * This function merges results from both vector similarity search and lexical text search
 * to provide comprehensive retrieval results. Vector search is weighted at 60% and lexical
 * search at 40%. Results are deduplicated by chunkId and merged scores are calculated
 * for chunks found in both searches.
 * 
 * @param options - Hybrid search options
 * @param options.projectId - Project ID to search within
 * @param options.query - Search query string
 * @param options.k - Maximum number of results to return
 * @returns Promise resolving to hybrid retrieval response with chunks and context pack
 * 
 * @example
 * ```typescript
 * const result = await hybridRetrieve({
 *   projectId: 'project-123',
 *   query: 'machine learning algorithms',
 *   k: 5
 * });
 * 
 * console.log(`Found ${result.chunks.length} chunks`);
 * console.log('Context pack:', result.contextPack);
 * ```
 */
export async function hybridRetrieve({
  projectId,
  query,
  k,
  userId
}: {
  projectId: string;
  query: string;
  k: number;
  userId?: string;
}): Promise<HybridRetrievalResponse> {
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
    // Generate query embedding for vector search
    const [queryEmbedding] = await embedMany([query.trim()]);
    
    // Perform both searches in parallel
    // Use k * 1.5 to get more candidates for better merging
    const searchK = Math.max(k, Math.ceil(k * 1.5));
    
    const [vectorResults, lexicalResults] = await Promise.all([
      vectorSearch(projectId, queryEmbedding, searchK, userId).catch(error => {
        console.warn('Vector search failed:', error);
        return []; // Fallback to empty results if vector search fails
      }),
      lexicalSearch(projectId, query.trim(), searchK, userId).catch(error => {
        console.warn('Lexical search failed:', error);
        return []; // Fallback to empty results if lexical search fails
      })
    ]);
    
    // Merge results with normalized scoring
    const mergedChunks = mergeResults(vectorResults, lexicalResults, k);
    
    // Build context pack
    const contextPack = buildContextPack(mergedChunks);
    
    return {
      chunks: mergedChunks,
      contextPack
    };
    
  } catch (error) {
    throw new Error(
      `Hybrid retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
