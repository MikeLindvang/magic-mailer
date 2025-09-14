import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
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

    // Verify asset exists and belongs to the project
    const assetsColl = await getColl<Asset>('assets');
    const asset = await assetsColl.findOne({
      _id: assetId,
      projectId,
    });

    if (!asset) {
      return Response.json(
        { ok: false, error: 'Asset not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Get all chunks for the asset
    const chunksColl = await getColl<Chunk>('chunks');
    const chunks = await chunksColl
      .find({ projectId, assetId })
      .sort({ chunkId: 1 }) // Sort by chunk ID for consistent ordering
      .toArray();

    return Response.json({
      ok: true,
      data: {
        asset,
        chunks,
      },
    } as ApiResponse<{ asset: Asset; chunks: Chunk[] }>);

  } catch (error) {
    console.error('Error fetching asset chunks:', error);
    
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

    // Find the asset to ensure it exists and belongs to the project (assetId is stored as string)
    const assetsColl = await getColl<Asset>('assets');
    const asset = await assetsColl.findOne({
      _id: assetId, // Use assetId as string, not ObjectId
      projectId,
    });

    if (!asset) {
      return Response.json(
        { ok: false, error: 'Asset not found' } as ApiResponse<never>,
        { status: 404 }
      );
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
      return Response.json(
        { ok: false, error: 'Failed to delete asset' } as ApiResponse<never>,
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: {
        assetId,
        deletedChunks: chunksDeleteResult.deletedCount,
      },
    } as ApiResponse<{ assetId: string; deletedChunks: number }>);

  } catch (error) {
    console.error('Error deleting asset:', error);
    
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
      return Response.json(
        { ok: false, error: 'Invalid project ID format' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateAssetSchema.parse(body);

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
      return Response.json(
        { ok: false, error: 'Asset not found' } as ApiResponse<never>,
        { status: 404 }
      );
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

    return Response.json({
      ok: true,
      data: updatedAssetWithChunkCount,
    } as ApiResponse<Asset & { chunkCount: number }>);

  } catch (error) {
    console.error('Error updating asset:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          ok: false, 
          error: error.errors.map(e => e.message).join(', ')
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
