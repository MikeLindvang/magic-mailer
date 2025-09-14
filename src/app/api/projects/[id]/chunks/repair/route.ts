import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Chunk } from '@/lib/schemas/chunk';
import { type Asset } from '@/lib/schemas/asset';
import { type Project } from '@/lib/schemas/project';
import { ObjectId } from 'mongodb';

/**
 * POST /api/projects/[id]/chunks/repair
 * 
 * Repairs orphaned chunks by either:
 * 1. Converting them to custom chunks (if they have no valid asset)
 * 2. Deleting them if they're corrupted
 */
export async function POST(
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
      return errorResponse('Invalid project ID format', 400);
    }

    // Verify project ownership
    const projectsColl = await getColl<Project>('projects');
    const project = await projectsColl.findOne({ 
      _id: projectId, // projectId is stored as string, not ObjectId
      userId 
    });
    
    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Get all chunks for the project
    const chunksColl = await getColl<Chunk>('chunks');
    const chunks = await chunksColl
      .find({ projectId, userId })
      .toArray();

    // Get all assets for the project
    const assetsColl = await getColl<Asset>('assets');
    const assets = await assetsColl
      .find({ projectId })
      .toArray();

    // Create a set of valid asset IDs for quick lookup
    const validAssetIds = new Set(assets.map(asset => asset._id));

    let orphanedChunks = 0;
    let convertedChunks = 0;
    const deletedChunks = 0;

    // Process each chunk
    for (const chunk of chunks) {
      // Skip chunks that are already custom (no assetId or empty assetId)
      if (!chunk.assetId || chunk.assetId.length === 0) {
        continue;
      }

      // Check if the asset exists
      const assetExists = validAssetIds.has(chunk.assetId);
      
      if (!assetExists) {
        orphanedChunks++;
        
        // Convert orphaned chunk to custom chunk
        const updateResult = await chunksColl.updateOne(
          { _id: chunk._id }, // chunk._id is stored as string, not ObjectId
          { 
            $set: { 
              assetId: '', // Mark as custom chunk
              updatedAt: new Date(),
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          convertedChunks++;
          console.log(`Converted orphaned chunk ${chunk._id} to custom chunk`);
        }
      }
    }

    const repairSummary = {
      totalChunks: chunks.length,
      orphanedChunks,
      convertedChunks,
      deletedChunks,
      validAssets: assets.length,
    };

    return successResponse({
      message: `Repair completed: ${convertedChunks} orphaned chunks converted to custom chunks`,
      summary: repairSummary,
    });

  } catch (error) {
    console.error('Error repairing chunks:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
