import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
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
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Update the project with style_profile_id
    const projectsColl = await getColl<Project>('projects');
    const updateData = {
      style_profile_id,
      updatedAt: new Date().toISOString(),
    };

    const result = await projectsColl.findOneAndUpdate(
      { _id: new ObjectId(projectId), userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Convert ObjectId to string for frontend
    const project: Project = {
      ...result,
      _id: result._id.toString(),
    };

    return Response.json({
      ok: true,
      data: project,
    } as ApiResponse<Project>);

  } catch (error) {
    console.error('Error saving project:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          ok: false, 
          error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` 
        } as ApiResponse<never>,
        { status: 400 }
      );
    }
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
