import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, ApiResponse } from '@/lib/auth/requireUser';
import { embedMany } from '@/lib/vector/embeddings';
import { getEmbeddingStats } from '@/lib/retrieval/vector';

/**
 * Request schema for embedding test
 */
const TestEmbeddingRequestSchema = z.object({
  texts: z.array(z.string().min(1)).min(1).max(5), // Limit to 5 texts for testing
  projectId: z.string().min(1).optional(), // Optional project ID to check stats
});

type TestEmbeddingRequest = z.infer<typeof TestEmbeddingRequestSchema>;

/**
 * Response type for embedding test
 */
interface TestEmbeddingResponse {
  embeddings: {
    text: string;
    embedding: number[];
    dimensions: number;
  }[];
  stats?: {
    totalChunks: number;
    chunksWithEmbeddings: number;
    embeddingDimensions: number | null;
    averageTextLength: number;
  };
}

/**
 * POST /api/test-embeddings
 * 
 * Test endpoint to verify that vector embeddings are working properly
 * This endpoint is for development and testing purposes only
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = TestEmbeddingRequestSchema.parse(body);
    const { texts, projectId } = validatedData;

    // Generate embeddings for test texts
    console.log(`Generating embeddings for ${texts.length} test texts...`);
    const embeddings = await embedMany(texts);
    console.log(`Successfully generated ${embeddings.length} embeddings`);

    // Prepare response data
    const embeddingResults = texts.map((text, index) => ({
      text,
      embedding: embeddings[index],
      dimensions: embeddings[index]?.length || 0,
    }));

    // Get project stats if projectId is provided
    let stats;
    if (projectId) {
      try {
        stats = await getEmbeddingStats(projectId);
      } catch (error) {
        console.warn('Failed to get embedding stats:', error);
        // Continue without stats rather than failing
      }
    }

    const response: ApiResponse<TestEmbeddingResponse> = {
      ok: true,
      data: {
        embeddings: embeddingResults,
        stats,
      },
    };

    return Response.json(response);

  } catch (error) {
    console.error('Test embeddings API error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const response: ApiResponse<never> = {
        ok: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
      };
      return Response.json(response, { status: 400 });
    }

    // Handle other errors
    const response: ApiResponse<never> = {
      ok: false,
      error: error instanceof Error ? error.message : 'Test embeddings failed',
    };
    return Response.json(response, { status: 500 });
  }
}

/**
 * GET /api/test-embeddings
 * 
 * Simple health check for embedding functionality
 */
export async function GET(): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    // Test with a simple text
    const testText = ['Hello, this is a test for vector embeddings.'];
    const embeddings = await embedMany(testText);

    const response: ApiResponse<{
      status: string;
      embeddingDimensions: number;
      testText: string;
    }> = {
      ok: true,
      data: {
        status: 'Embeddings are working correctly',
        embeddingDimensions: embeddings[0]?.length || 0,
        testText: testText[0],
      },
    };

    return Response.json(response);

  } catch (error) {
    console.error('Embedding health check failed:', error);

    const response: ApiResponse<never> = {
      ok: false,
      error: error instanceof Error ? error.message : 'Embedding system not working',
    };
    return Response.json(response, { status: 500 });
  }
}
