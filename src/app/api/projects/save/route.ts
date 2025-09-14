import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Request schema for saving project style profile
 */
const SaveProjectSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  style_profile_id: z.string().optional(),
});

/**
 * POST /api/projects/save
 * 
 * Updates a project's style_profile_id
 */
export async function POST(request: Request): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SaveProjectSchema.parse(body);
    const { projectId, style_profile_id } = validatedData;

    // Validate ObjectId format
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Update the project with style_profile_id
    const projectsColl = await getColl<Project>('projects');
    const updateData = {
      style_profile_id,
      updatedAt: new Date().toISOString(),
    };

    const result = await projectsColl.findOneAndUpdate(
      { _id: projectId, userId }, // projectId is stored as string, not ObjectId
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Convert ObjectId to string for frontend
    const project: Project = {
      ...result,
      _id: result._id.toString(),
    };

    return successResponse(project);

  } catch (error) {
    console.error('Error saving project:', error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
