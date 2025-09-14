import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type Chunk } from '@/lib/schemas/chunk';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Schema for updating a chunk
 */
const UpdateChunkSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  section: z.string().optional(),
});

/**
 * PUT /api/projects/[id]/chunks/[chunkId]
 * 
 * Updates a custom chunk (asset-derived chunks cannot be edited)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const { id: projectId, chunkId } = resolvedParams;

  try {
    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), 
      userId 
    });
    
    if (!project) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Find the chunk
    const chunksColl = await getColl<Chunk>('chunks');
    const chunk = await chunksColl.findOne({
      _id: new ObjectId(chunkId),
      projectId,
      userId,
    });

    if (!chunk) {
      return Response.json(
        { ok: false, error: 'Chunk not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Only allow editing custom chunks (those without assetId)
    if (chunk.assetId && chunk.assetId.length > 0) {
      return Response.json(
        { ok: false, error: 'Cannot edit chunks derived from assets. Create a custom chunk instead.' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateChunkSchema.parse(body);

    // Build update object
    const updateData: Partial<Chunk> = {
      updatedAt: new Date(),
    };

    if (validatedData.content !== undefined) {
      updateData.md_text = validatedData.content;
      updateData.tokens = Math.ceil(validatedData.content.length / 4); // Rough token estimate
    }

    if (validatedData.section !== undefined) {
      updateData.section = validatedData.section;
    }

    if (validatedData.title !== undefined) {
      updateData.meta = {
        ...chunk.meta,
        hpath: [validatedData.title],
      };
    }

    // Update the chunk
    const result = await chunksColl.updateOne(
      { _id: new ObjectId(chunkId), projectId, userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { ok: false, error: 'Chunk not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Fetch and return updated chunk
    const updatedChunk = await chunksColl.findOne({
      _id: new ObjectId(chunkId),
      projectId,
      userId,
    });

    return Response.json({
      ok: true,
      data: {
        ...updatedChunk,
        isCustom: true,
      },
    } as ApiResponse<Chunk & { isCustom: boolean }>);

  } catch (error) {
    console.error('Error updating chunk:', error);
    
    // Handle validation errors
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

/**
 * DELETE /api/projects/[id]/chunks/[chunkId]
 * 
 * Deletes a custom chunk (asset-derived chunks cannot be deleted individually)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const { id: projectId, chunkId } = resolvedParams;

  try {
    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), 
      userId 
    });
    
    if (!project) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Find the chunk to verify ownership and type
    const chunksColl = await getColl<Chunk>('chunks');
    const chunk = await chunksColl.findOne({
      _id: new ObjectId(chunkId),
      projectId,
      userId,
    });

    if (!chunk) {
      return Response.json(
        { ok: false, error: 'Chunk not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Only allow deleting custom chunks (those without assetId)
    if (chunk.assetId && chunk.assetId.length > 0) {
      return Response.json(
        { ok: false, error: 'Cannot delete chunks derived from assets. Delete the asset instead.' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Delete the chunk
    const result = await chunksColl.deleteOne({
      _id: new ObjectId(chunkId),
      projectId,
      userId,
    });

    if (result.deletedCount === 0) {
      return Response.json(
        { ok: false, error: 'Chunk not found or access denied' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      data: { message: 'Chunk deleted successfully' },
    } as ApiResponse<{ message: string }>);

  } catch (error) {
    console.error('Error deleting chunk:', error);
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
