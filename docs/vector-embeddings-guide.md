# Vector Embeddings Guide

This guide covers the vector embedding system in Magic Mailer, including setup, testing, and troubleshooting.

## Overview

Magic Mailer uses OpenAI's `text-embedding-3-small` model to generate vector embeddings for content chunks. These embeddings enable semantic search and hybrid retrieval for improved content discovery.

## Features

- **Automatic Embedding Generation**: Embeddings are generated during content ingestion
- **Hybrid Retrieval**: Combines vector similarity search with lexical search
- **Scalable Processing**: Batched embedding generation for performance
- **Graceful Fallback**: System continues working even if embeddings fail

## Setup Requirements

### 1. OpenAI API Key

Add your OpenAI API key to `.env.local`:

```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
```

**Getting an API Key:**
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-proj-` or `sk-`)

### 2. Verify Setup

Run the environment verification script:

```bash
node scripts/verify-env.js
```

Should show: `✅ OPENAI_API_KEY: sk-proj-...****`

## How It Works

### 1. Content Ingestion Pipeline

When content is ingested via `/api/ingest`:

```typescript
// 1. Content is chunked by headings
const markdownChunks = chunkMarkdown(markdown);

// 2. Embeddings are generated for all chunks
const chunkTexts = markdownChunks.map(chunk => chunk.md_text);
const embeddings = await embedMany(chunkTexts);

// 3. Chunks are stored with embeddings
const chunks = markdownChunks.map((chunk, index) => ({
  // ... other fields
  vector: embeddings.length > 0,
  embedding: embeddings[index] || undefined,
}));
```

### 2. Hybrid Retrieval System

The `/api/retriever` endpoint combines:

- **Vector Search** (60% weight): Semantic similarity using cosine similarity
- **Lexical Search** (40% weight): Traditional text matching

```typescript
const results = await hybridRetrieve({
  projectId: 'your-project-id',
  query: 'your search query',
  k: 5 // number of results
});
```

## Testing the System

### 1. Basic Health Check

Test that embeddings are working:

```bash
curl -X GET http://localhost:3000/api/test-embeddings \
  -H "Authorization: Bearer your-clerk-jwt"
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "status": "Embeddings are working correctly",
    "embeddingDimensions": 1536,
    "testText": "Hello, this is a test for vector embeddings."
  }
}
```

### 2. Generate Test Embeddings

Test embedding generation with custom texts:

```bash
curl -X POST http://localhost:3000/api/test-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-jwt" \
  -d '{
    "texts": [
      "Machine learning algorithms",
      "Natural language processing",
      "Vector databases and similarity search"
    ]
  }'
```

### 3. Test Content Ingestion

Ingest content and verify embeddings are generated:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-jwt" \
  -d '{
    "projectId": "your-project-id",
    "source": {
      "type": "text",
      "value": "# Test Document\n\nThis is a test document for embedding generation.\n\n## Section 1\n\nContent about machine learning and AI.\n\n## Section 2\n\nMore content about natural language processing."
    },
    "assetType": "md",
    "title": "Test Embedding Document"
  }'
```

Check the server logs for:
```
Generating embeddings for 3 chunks...
Successfully generated 3 embeddings
```

### 4. Test Hybrid Retrieval

Search for content using the hybrid retrieval system:

```bash
curl -X POST http://localhost:3000/api/retriever \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-jwt" \
  -d '{
    "projectId": "your-project-id",
    "query": "machine learning algorithms",
    "k": 5
  }'
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "chunks": [
      {
        "chunkId": "chunk-1",
        "score": 0.85,
        "md_text": "Content about machine learning and AI.",
        "hpath": ["Test Document", "Section 1"],
        "source": "both"
      }
    ],
    "contextPack": "## [chunk-1] (Test Document > Section 1)\n\nContent about machine learning and AI.\n"
  }
}
```

## Monitoring and Debugging

### 1. Check Embedding Statistics

Get statistics for a project's embeddings:

```bash
curl -X POST http://localhost:3000/api/test-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-jwt" \
  -d '{
    "texts": ["test"],
    "projectId": "your-project-id"
  }'
```

The response includes stats:
```json
{
  "ok": true,
  "data": {
    "embeddings": [...],
    "stats": {
      "totalChunks": 25,
      "chunksWithEmbeddings": 25,
      "embeddingDimensions": 1536,
      "averageTextLength": 247
    }
  }
}
```

### 2. Server Logs

Monitor the application logs for embedding-related messages:

```bash
# In development
npm run dev

# Look for messages like:
# "Generating embeddings for 5 chunks..."
# "Successfully generated 5 embeddings"
# "Failed to generate embeddings, proceeding without them: ..."
```

### 3. Database Inspection

Check the MongoDB chunks collection:

```javascript
// Connect to MongoDB
use magic-mailer;

// Count total chunks
db.chunks.countDocuments();

// Count chunks with embeddings
db.chunks.countDocuments({ 
  embedding: { $exists: true, $ne: null },
  "embedding.0": { $exists: true }
});

// Check embedding dimensions
db.chunks.findOne({ 
  embedding: { $exists: true } 
}, { embedding: 1 });
```

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Missing

**Error:**
```
Error: OPENAI_API_KEY environment variable is required
```

**Solution:**
1. Add `OPENAI_API_KEY` to `.env.local`
2. Restart the development server
3. Verify with `node scripts/verify-env.js`

#### 2. API Rate Limits

**Error:**
```
Failed to generate embeddings for batch 1: Rate limit exceeded
```

**Solution:**
- Check your OpenAI API usage limits
- Consider upgrading your OpenAI plan
- The system will continue without embeddings if generation fails

#### 3. Invalid API Key

**Error:**
```
Failed to generate embeddings: Invalid API key provided
```

**Solution:**
1. Verify your API key at [OpenAI Platform](https://platform.openai.com/api-keys)
2. Generate a new key if needed
3. Update `.env.local` with the new key

#### 4. No Embeddings in Database

**Symptoms:**
- Vector search returns empty results
- `chunksWithEmbeddings` is 0 in stats

**Debugging:**
1. Check server logs during ingestion
2. Verify OpenAI API key is valid
3. Test with `/api/test-embeddings`
4. Re-ingest content if needed

#### 5. Hybrid Retrieval Not Working

**Symptoms:**
- Search returns no results
- Only lexical or only vector results

**Debugging:**
1. Test vector search independently
2. Check if chunks have embeddings
3. Verify project ownership in retrieval API
4. Test with simple queries first

## Performance Considerations

### 1. Batch Processing

Embeddings are generated in batches of 100 texts for optimal performance:

```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < texts.length; i += BATCH_SIZE) {
  const batch = texts.slice(i, i + BATCH_SIZE);
  // Generate embeddings for batch
}
```

### 2. Model Selection

We use `text-embedding-3-small` for:
- **Cost efficiency**: Lower cost per token
- **Good performance**: 1536 dimensions
- **Fast processing**: Optimized for speed

### 3. Storage Optimization

- Embeddings are only stored if generation succeeds
- Failed embedding generation doesn't block ingestion
- Graceful fallback to lexical-only search

## API Reference

### Embedding Generation

```typescript
import { embedMany } from '@/lib/vector/embeddings';

const embeddings = await embedMany([
  'First text to embed',
  'Second text to embed'
]);
// Returns: number[][]
```

### Vector Search

```typescript
import { vectorSearch } from '@/lib/retrieval/vector';

const results = await vectorSearch(
  'project-id',
  queryVector,
  5 // top-k results
);
```

### Hybrid Retrieval

```typescript
import { hybridRetrieve } from '@/lib/retrieval/hybrid';

const results = await hybridRetrieve({
  projectId: 'project-id',
  query: 'search query',
  k: 5
});
```

## Best Practices

1. **Environment Setup**: Always verify OpenAI API key before deployment
2. **Error Handling**: Monitor embedding generation failures
3. **Performance**: Use appropriate batch sizes for large content ingestion
4. **Testing**: Regularly test the embedding system with sample content
5. **Monitoring**: Track embedding statistics and search performance

## Migration from Disabled State

If you previously had embeddings disabled:

1. **Update Environment**: Add `OPENAI_API_KEY` to `.env.local`
2. **Restart Server**: Restart your development/production server
3. **Re-ingest Content**: Existing content won't have embeddings automatically
4. **Verify Operation**: Use test endpoints to confirm embeddings are working

### Re-ingesting Existing Content

To add embeddings to existing content, you'll need to re-ingest it:

```bash
# Example: Re-ingest by fetching and re-posting content
# This would need to be done for each piece of existing content
```

The system is designed to handle both scenarios gracefully - content with and without embeddings can coexist.
