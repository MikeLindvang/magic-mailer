import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { type Draft } from '@/lib/schemas/draft';

/**
 * DELETE /api/projects/[id]/drafts/[draftId]
 * 
 * Deletes a specific draft from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
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
    const draftId = resolvedParams.draftId;

    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Validate ObjectId format for draftId
    if (!ObjectId.isValid(draftId)) {
      return errorResponse('Invalid draft ID format', 400);
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

    // Check if the draft exists and belongs to this project
    const draft = await draftsCollection.findOne({
      _id: new ObjectId(draftId),
      projectId // Use string for foreign key relationship
    });

    if (!draft) {
      return errorResponse('Draft not found or access denied', 404);
    }

    // Delete the draft
    const deleteResult = await draftsCollection.deleteOne({
      _id: new ObjectId(draftId),
      projectId // Ensure we only delete drafts from this project
    });

    if (deleteResult.deletedCount === 0) {
      return errorResponse('Draft not found or could not be deleted', 404);
    }

    return successResponse({ 
      message: 'Draft deleted successfully',
      draftId: draftId
    });

  } catch (error) {
    console.error('Error deleting draft:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete draft',
      500
    );
  }
}
