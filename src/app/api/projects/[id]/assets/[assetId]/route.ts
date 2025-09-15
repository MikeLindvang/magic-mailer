import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Asset } from '@/lib/schemas/asset';
import { type Chunk } from '@/lib/schemas/chunk';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Request schema for updating an asset
 */
const UpdateAssetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
});

/**
 * GET /api/projects/[id]/assets/[assetId]
 * 
 * Retrieves all chunks for a specific asset
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const { id: projectId, assetId } = resolvedParams;

  try {
    // Validate ObjectId format for projectId only (assetId is stored as string)
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), // Convert string to ObjectId for query 
      userId 
    });
    
    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Verify asset exists and belongs to the project
    const assetsColl = await getColl<Asset>('assets');
    const asset = await assetsColl.findOne({
      _id: assetId,
      projectId,
    });

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    // Get all chunks for the asset
    const chunksColl = await getColl<Chunk>('chunks');
    const chunks = await chunksColl
      .find({ projectId, assetId })
      .sort({ chunkId: 1 }) // Sort by chunk ID for consistent ordering
      .toArray();

    return successResponse({
      asset,
      chunks,
    });

  } catch (error) {
    console.error('Error fetching asset chunks:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * DELETE /api/projects/[id]/assets/[assetId]
 * 
 * Deletes a specific asset and all its associated chunks
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const { id: projectId, assetId } = resolvedParams;

  try {
    // Validate ObjectId format for projectId only (assetId is stored as string)
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), // Convert string to ObjectId for query 
      userId 
    });
    
    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Find the asset to ensure it exists and belongs to the project (assetId is stored as string)
    const assetsColl = await getColl<Asset>('assets');
    const asset = await assetsColl.findOne({
      _id: assetId, // Use assetId as string, not ObjectId
      projectId,
    });

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    // Delete all chunks associated with this asset
    const chunksColl = await getColl<Chunk>('chunks');
    const chunksDeleteResult = await chunksColl.deleteMany({
      projectId,
      assetId: assetId, // assetId is stored as string in chunks
    });

    // Delete the asset itself (assetId is stored as string)
    const assetDeleteResult = await assetsColl.deleteOne({
      _id: assetId, // Use assetId as string, not ObjectId
      projectId,
    });

    if (assetDeleteResult.deletedCount === 0) {
      return errorResponse('Failed to delete asset', 500);
    }

    return successResponse({
      assetId,
      deletedChunks: chunksDeleteResult.deletedCount,
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * PUT /api/projects/[id]/assets/[assetId]
 * 
 * Updates a specific asset (currently supports title updates)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;
  const resolvedParams = await params;
  const { id: projectId, assetId } = resolvedParams;

  try {
    // Validate ObjectId format for projectId only (assetId is stored as string)
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateAssetSchema.parse(body);

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), // Convert string to ObjectId for query 
      userId 
    });
    
    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Update the asset (assetId is stored as string, not ObjectId)
    const assetsColl = await getColl<Asset>('assets');
    const updateResult = await assetsColl.findOneAndUpdate(
      {
        _id: assetId, // Use assetId as string, not ObjectId
        projectId,
      },
      {
        $set: {
          title: validatedData.title,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    if (!updateResult) {
      return errorResponse('Asset not found', 404);
    }

    // Get chunk count for the updated asset
    const chunksColl = await getColl<Chunk>('chunks');
    const chunkCount = await chunksColl.countDocuments({
      projectId,
      assetId: assetId, // assetId is stored as string in chunks
    });

    const updatedAssetWithChunkCount = {
      ...updateResult,
      chunkCount,
    };

    return successResponse(updatedAssetWithChunkCount);

  } catch (error) {
    console.error('Error updating asset:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(
        error.errors.map(e => e.message).join(', '),
        400
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
