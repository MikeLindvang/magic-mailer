import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { z } from 'zod';

/**
 * Request schema for creating projects
 */
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

/**
 * GET /api/projects
 * 
 * Retrieves all projects for the authenticated user
 */
export async function GET(): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;

  try {
    // Get all projects for the user
    const projectsColl = await getColl('projects');
    const projectsFromDb = await projectsColl
      .find({ userId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Convert ObjectId to string for frontend
    const projects: Project[] = projectsFromDb.map(project => ({
      ...project,
      _id: project._id.toString(),
    }));

    return Response.json({
      ok: true,
      data: projects,
    } as ApiResponse<Project[]>);

  } catch (error) {
    console.error('Error fetching projects:', error);
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * 
 * Creates a new project for the authenticated user
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
    const validatedData = CreateProjectSchema.parse(body);

    // Create new project
    const projectsColl = await getColl<Project>('projects');
    const now = new Date().toISOString();
    
    const newProject: Omit<Project, '_id'> = {
      ...validatedData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await projectsColl.insertOne(newProject);
    
    const createdProject: Project = {
      _id: result.insertedId.toString(),
      ...newProject,
    };

    return Response.json({
      ok: true,
      data: createdProject,
    } as ApiResponse<Project>, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    
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
