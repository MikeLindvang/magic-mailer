import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type Asset } from '@/lib/schemas/asset';
import { type Chunk } from '@/lib/schemas/chunk';
import { ObjectId } from 'mongodb';

/**
 * Asset with chunk count for display
 */
interface AssetWithChunkCount extends Asset {
  chunkCount: number;
}

/**
 * GET /api/projects/[id]/assets
 * 
 * Retrieves all assets for a specific project with chunk counts
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

    // Get all assets for the project
    const assetsColl = await getColl<Asset>('assets');
    const assets = await assetsColl
      .find({ projectId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Get chunk counts for each asset
    const chunksColl = await getColl<Chunk>('chunks');
    const assetsWithChunkCounts: AssetWithChunkCount[] = await Promise.all(
      assets.map(async (asset) => {
        const chunkCount = await chunksColl.countDocuments({
          projectId,
          assetId: asset._id,
        });
        
        return {
          ...asset,
          chunkCount,
        };
      })
    );

    return Response.json({
      ok: true,
      data: assetsWithChunkCounts,
    } as ApiResponse<AssetWithChunkCount[]>);

  } catch (error) {
    console.error('Error fetching assets:', error);
    
    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
