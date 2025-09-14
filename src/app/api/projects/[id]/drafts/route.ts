import { NextRequest } from 'next/server';
import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
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
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Get database collections
    const projectsCollection = await getColl('projects');
    const draftsCollection = await getColl<Draft>('drafts');

    // Verify project exists and user owns it
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId),
      userId
    });

    if (!project) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Retrieve all drafts for this project, sorted by creation date (newest first)
    const drafts = await draftsCollection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({
      ok: true,
      data: drafts
    } as ApiResponse<Draft[]>);

  } catch (error) {
    console.error('Error retrieving drafts:', error);
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve drafts' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
