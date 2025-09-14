import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Chunk } from '@/lib/schemas/chunk';
import { type Asset } from '@/lib/schemas/asset';
import { ObjectId } from 'mongodb';

/**
 * GET /api/projects/[id]/chunks/debug
 * 
 * Debug endpoint to investigate chunk-asset relationships
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
      return errorResponse('Invalid project ID format', 400);
    }

    // Verify project ownership
    const projectsColl = await getColl('projects');
    const project = await projectsColl.findOne({ 
      _id: new ObjectId(projectId), 
      userId 
    });
    
    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Get all chunks for the project
    const chunksColl = await getColl<Chunk>('chunks');
    const chunks = await chunksColl
      .find({ projectId, userId })
      .limit(10) // Limit to first 10 for debugging
      .toArray();

    // Get all assets for the project
    const assetsColl = await getColl<Asset>('assets');
    const assets = await assetsColl
      .find({ projectId })
      .toArray();

    // Debug info
    const debugInfo = {
      projectId,
      chunksCount: chunks.length,
      assetsCount: assets.length,
      chunks: chunks.map(chunk => ({
        _id: chunk._id,
        chunkId: chunk.chunkId,
        assetId: chunk.assetId,
        assetIdType: typeof chunk.assetId,
        assetIdLength: chunk.assetId?.length || 0,
        hasAssetId: !!(chunk.assetId && chunk.assetId.length > 0),
        title: chunk.meta?.hpath?.[0] || 'No title',
      })),
      assets: assets.map(asset => ({
        _id: asset._id,
        title: asset.title,
        type: asset.type,
        idType: typeof asset._id,
        idLength: asset._id?.toString().length || 0,
      })),
      // Try to match chunks to assets
      matches: chunks.map(chunk => {
        if (!chunk.assetId || chunk.assetId.length === 0) {
          return {
            chunkId: chunk._id,
            assetId: chunk.assetId,
            match: 'CUSTOM_CHUNK',
            asset: null
          };
        }

        // Try exact match first
        let matchedAsset = assets.find(asset => asset._id === chunk.assetId);
        if (matchedAsset) {
          return {
            chunkId: chunk._id,
            assetId: chunk.assetId,
            match: 'EXACT_MATCH',
            asset: { _id: matchedAsset._id, title: matchedAsset.title }
          };
        }

        // Try ObjectId conversion both ways
        try {
          // Try converting chunk assetId to ObjectId and compare as string
          const chunkAsObjectId = new ObjectId(chunk.assetId).toString();
          matchedAsset = assets.find(asset => asset._id === chunkAsObjectId);
          if (matchedAsset) {
            return {
              chunkId: chunk._id,
              assetId: chunk.assetId,
              match: 'CHUNK_OBJECTID_TO_STRING_MATCH',
              asset: { _id: matchedAsset._id, title: matchedAsset.title }
            };
          }

          // Try converting asset _id to ObjectId and compare with chunk assetId
          matchedAsset = assets.find(asset => {
            try {
              return new ObjectId(asset._id).toString() === chunk.assetId;
            } catch {
              return false;
            }
          });
          if (matchedAsset) {
            return {
              chunkId: chunk._id,
              assetId: chunk.assetId,
              match: 'ASSET_OBJECTID_TO_STRING_MATCH',
              asset: { _id: matchedAsset._id, title: matchedAsset.title }
            };
          }
        } catch {
          // Ignore ObjectId conversion errors
        }

        return {
          chunkId: chunk._id,
          assetId: chunk.assetId,
          match: 'NO_MATCH',
          asset: null
        };
      })
    };

    return successResponse(debugInfo);

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
