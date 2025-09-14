import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
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
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Get the project and verify ownership
    const projectsColl = await getColl<Project>('projects');
    const project = await projectsColl.findOne({
      _id: new ObjectId(projectId),
      userId // Ensure user owns the project
    });

    if (!project) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Convert ObjectId to string for frontend
    const projectData: Project = {
      ...project,
      _id: project._id.toString(),
    };

    return Response.json({
      ok: true,
      data: projectData,
    } as ApiResponse<Project>);

  } catch (error) {
    console.error('Error fetching project:', error);
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}