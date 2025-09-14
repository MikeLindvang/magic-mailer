import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, ApiResponse } from '@/lib/auth/requireUser';
import { successResponse, errorResponse, jsonResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { hybridRetrieve, HybridRetrievalResponse } from '@/lib/retrieval/hybrid';

/**
 * Request schema for retrieval API
 */
const RetrievalRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  query: z.string().min(1, 'Query is required'),
  k: z.number().int().positive().optional().default(5),
});

// type RetrievalRequest = z.infer<typeof RetrievalRequestSchema>;

/**
 * POST /api/retriever
 * 
 * Performs hybrid retrieval (vector + lexical search) on project chunks
 * 
 * @param request - Request containing projectId, query, and optional k
 * @returns ApiResponse with hybrid retrieval results
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = RetrievalRequestSchema.parse(body);
    const { projectId, query, k } = validatedData;

    // Verify project ownership
    const projectsColl = await getColl<Project>('projects');
    const project = await projectsColl.findOne({ 
      _id: projectId, 
      userId 
    });
    
    if (!project) {
      const response: ApiResponse<never> = {
        ok: false,
        error: 'Project not found or access denied',
      };
      return jsonResponse(response, { status: 404 });
    }

    // Perform hybrid retrieval
    const retrievalResult = await hybridRetrieve({
      projectId,
      query,
      k,
    });

    // Return successful response
    const response: ApiResponse<HybridRetrievalResponse> = {
      ok: true,
      data: retrievalResult,
    };

    return jsonResponse(response);

  } catch (error) {
    console.error('Retrieval API error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const response: ApiResponse<never> = {
        ok: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
      };
      return jsonResponse(response, { status: 400 });
    }

    // Handle other errors
    const response: ApiResponse<never> = {
      ok: false,
      error: error instanceof Error ? error.message : 'Retrieval failed',
    };
    return jsonResponse(response, { status: 500 });
  }
}
