import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { ObjectId } from 'mongodb';
import { type Draft } from '@/lib/schemas/draft';

/**
 * GET /api/projects/[id]/drafts
 * 
 * Retrieves all drafts for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Authenticate user
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  const { userId } = authResult;

  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Get database collections
    const projectsCollection = await getColl('projects');
    const draftsCollection = await getColl<Draft>('drafts');

    // Verify project exists and user owns it
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId), // Convert string to ObjectId for query
      userId
    });

    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Retrieve all drafts for this project, sorted by creation date (newest first)
    const drafts = await draftsCollection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    return successResponse(drafts);

  } catch (error) {
    console.error('Error retrieving drafts:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to retrieve drafts',
      500
    );
  }
}
