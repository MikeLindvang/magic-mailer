# Vector Retrieval

This module provides vector-based similarity search functionality for retrieving relevant chunks within a project.

## Features

- **Top-k vector search**: Find the most similar chunks to a query vector
- **Project-scoped search**: Search within a specific project's chunks
- **Cosine similarity**: Uses cosine similarity for scoring chunk relevance
- **Robust error handling**: Handles missing embeddings and dimension mismatches
- **Performance monitoring**: Includes utilities for analyzing embedding coverage

## Usage

### Basic Vector Search

```typescript
import { vectorSearch } from '@/lib/retrieval/vector';
import { embedMany } from '@/lib/vector/embeddings';

// Generate query embedding
const queryText = "How to implement user authentication?";
const [queryVector] = await embedMany([queryText]);

// Search for top 5 most similar chunks
const results = await vectorSearch('project-123', queryVector, 5);

results.forEach((result, index) => {
  console.log(`Result ${index + 1}:`);
  console.log(`  Score: ${result.score.toFixed(3)}`);
  console.log(`  Path: ${result.hpath.join(' > ')}`);
  console.log(`  Text: ${result.md_text.substring(0, 100)}...`);
  console.log('');
});
```

### Embedding Statistics

```typescript
import { getEmbeddingStats } from '@/lib/retrieval/vector';

const stats = await getEmbeddingStats('project-123');
console.log(`Total chunks: ${stats.totalChunks}`);
console.log(`Chunks with embeddings: ${stats.chunksWithEmbeddings}`);
console.log(`Embedding coverage: ${(stats.chunksWithEmbeddings / stats.totalChunks * 100).toFixed(1)}%`);
console.log(`Embedding dimensions: ${stats.embeddingDimensions}`);
console.log(`Average text length: ${stats.averageTextLength} characters`);
```

### API Integration Example

```typescript
// app/api/search/route.ts
import { auth } from '@clerk/nextjs/server';
import { vectorSearch } from '@/lib/retrieval/vector';
import { embedMany } from '@/lib/vector/embeddings';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, query, k = 10 } = await request.json();
    
    // Generate embedding for the query
    const [queryVector] = await embedMany([query]);
    
    // Perform vector search
    const results = await vectorSearch(projectId, queryVector, k);
    
    return Response.json({ 
      ok: true, 
      data: {
        results,
        query,
        totalResults: results.length
      }
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Search failed' 
    }, { status: 500 });
  }
}
```

## Implementation Details

### Cosine Similarity

The search uses cosine similarity to measure the angle between vectors, providing a normalized similarity score between 0 and 1:

- **1.0**: Perfect similarity (identical direction)
- **0.0**: No similarity (orthogonal vectors)
- **Close to 1**: High semantic similarity

### Database Requirements

Chunks must have:
- Valid `projectId` for scoping
- `embedding` field with numerical array
- Non-empty embedding arrays
- Matching dimensions with query vector

### Performance Considerations

- **Memory usage**: All project chunks are loaded into memory for scoring
- **Computation**: O(n) cosine similarity calculations where n = chunks with embeddings
- **Optimization**: Consider implementing vector database (e.g., MongoDB Atlas Vector Search) for large datasets

### Error Handling

The function handles various edge cases:
- Missing or empty embeddings are skipped
- Dimension mismatches are logged and skipped
- Invalid parameters throw descriptive errors
- Database connection errors are propagated

## Future Enhancements

- **Native vector search**: Integrate with MongoDB Atlas Vector Search for better performance
- **Hybrid search**: Combine vector similarity with keyword matching
- **Filtering**: Add metadata-based filtering (date ranges, document types, etc.)
- **Caching**: Implement query result caching for frequently searched terms
- **Batch search**: Support multiple query vectors in a single request
