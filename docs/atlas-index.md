# MongoDB Atlas Vector Index Configuration

This document provides the JSON configuration needed to create a vector search index in MongoDB Atlas for the Magic Mailer application.

## Vector Index for Chunks Collection

Create a vector search index on the `chunks` collection to enable semantic search functionality.

### Index Configuration

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "vector",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    },
    {
      "type": "filter", 
      "path": "projectId"
    },
    {
      "type": "filter",
      "path": "assetId"
    }
  ]
}
```

### Configuration Details

- **Collection**: `chunks`
- **Vector Field**: `vector` (1536 dimensions for OpenAI embeddings)
- **Similarity**: `cosine` (recommended for text embeddings)
- **Filter Fields**: 
  - `userId` - Ensures user data isolation
  - `projectId` - Enables project-scoped searches
  - `assetId` - Allows asset-specific filtering

### Creating the Index

1. Navigate to your MongoDB Atlas cluster
2. Go to the "Search" tab
3. Click "Create Search Index"
4. Select "JSON Editor"
5. Choose the `chunks` collection
6. Paste the JSON configuration above
7. Name the index `vector_search`
8. Click "Next" and then "Create Search Index"

### Usage in Application

The vector index enables semantic search queries in the application:

```typescript
const results = await db.collection('chunks').aggregate([
  {
    $vectorSearch: {
      index: 'vector_search',
      path: 'vector',
      queryVector: searchVector,
      numCandidates: 100,
      limit: 10,
      filter: {
        userId: userId,
        projectId: projectId
      }
    }
  }
]);
```

## Notes

- The index creation process may take several minutes depending on collection size
- Vector dimensions (1536) match OpenAI's `text-embedding-3-small` model
- Filter fields ensure proper user access control and data isolation
- Cosine similarity is optimal for normalized text embeddings
