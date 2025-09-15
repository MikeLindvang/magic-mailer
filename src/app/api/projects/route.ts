import { requireUser } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type Project } from '@/lib/schemas/project';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ObjectId } from 'mongodb';
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
    const projects = await projectsColl
      .find({ userId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Projects already have string IDs, no conversion needed
    return successResponse(projects);

  } catch (error) {
    console.error('Error fetching projects:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
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
    const projectsColl = await getColl('projects');
    const now = new Date().toISOString();
    const projectId = new ObjectId();
    
    const newProject = {
      _id: projectId,
      ...validatedData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await projectsColl.insertOne(newProject);

    // Return with string ID for frontend
    const responseProject = {
      ...newProject,
      _id: projectId.toString(),
    };

    return successResponse(responseProject, 201);

  } catch (error) {
    console.error('Error creating project:', error);
    
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
