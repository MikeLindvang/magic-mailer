import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { ObjectId } from 'mongodb';

/**
 * GET /api/projects/[id]
 * 
 * Retrieves a specific project by ID for the authenticated user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Get the project and verify ownership
    const projectsColl = await getColl<Project>('projects');
    const project = await projectsColl.findOne({
      _id: projectId, // projectId is stored as string, not ObjectId
      userId // Ensure user owns the project
    });

    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Project data is already in the correct format (string IDs)
    return successResponse(project);

  } catch (error) {
    console.error('Error fetching project:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}