import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for multiple texts using OpenAI's text-embedding-3-small model
 * Batches requests in chunks of 100 for optimal performance
 * 
 * @param texts - Array of text strings to embed
 * @returns Promise resolving to array of embedding vectors (number[][])
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  // Process texts in batches of 100
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float',
      });

      // Extract embeddings from response and add to results
      const batchEmbeddings = response.data.map(item => item.embedding);
      allEmbeddings.push(...batchEmbeddings);
      
    } catch (error) {
      throw new Error(
        `Failed to generate embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return allEmbeddings;
}
