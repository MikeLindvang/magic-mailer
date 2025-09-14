import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type Chunk, zCreateChunk } from '@/lib/schemas/chunk';
import { type Asset } from '@/lib/schemas/asset';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Chunk with asset information for display
 */
interface ChunkWithAsset extends Chunk {
  assetTitle?: string;
  assetType?: Asset['type'];
  isCustom?: boolean; // True for user-created chunks, false for asset-derived chunks
}

/**
 * Schema for creating a custom chunk
 */
const CreateCustomChunkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  section: z.string().optional(),
});

/**
 * GET /api/projects/[id]/chunks
 * 
 * Retrieves all chunks for a specific project, including both asset-derived
 * and custom user-created chunks
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

    // Get all chunks for the project
    const chunksColl = await getColl<Chunk>('chunks');
    const chunks = await chunksColl
      .find({ projectId, userId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Get asset information for each chunk
    const assetsColl = await getColl<Asset>('assets');
    const chunksWithAssets: ChunkWithAsset[] = await Promise.all(
      chunks.map(async (chunk) => {
        let assetTitle: string | undefined;
        let assetType: Asset['type'] | undefined;
        let isCustom = false;

        if (chunk.assetId && chunk.assetId.length > 0) {
          // This is an asset-derived chunk - try multiple lookup strategies
          let asset: Asset | null = null;
          
          // Strategy 1: Direct string match
          try {
            asset = await assetsColl.findOne({
              _id: chunk.assetId,
              projectId,
            });
          } catch (error) {
            console.log(`Direct string lookup failed for ${chunk.assetId}:`, error);
          }
          
          // Strategy 2: Convert chunk assetId to ObjectId
          if (!asset) {
            try {
              asset = await assetsColl.findOne({
                _id: new ObjectId(chunk.assetId),
                projectId,
              });
            } catch (error) {
              console.log(`ObjectId lookup failed for ${chunk.assetId}:`, error);
            }
          }
          
          // Strategy 3: Compare ObjectId strings (handle both directions)
          if (!asset) {
            try {
              // Get all assets for this project and try to match
              const allAssets = await assetsColl.find({ projectId }).toArray();
              asset = allAssets.find(a => {
                // Try exact match
                if (a._id === chunk.assetId) return true;
                
                // Try ObjectId string comparison both ways
                try {
                  const aIdAsString = new ObjectId(a._id).toString();
                  const chunkIdAsString = new ObjectId(chunk.assetId).toString();
                  return aIdAsString === chunkIdAsString;
                } catch {
                  return false;
                }
              }) || null;
            } catch (error) {
              console.log(`Comprehensive lookup failed for ${chunk.assetId}:`, error);
            }
          }
          
          if (asset) {
            assetTitle = asset.title;
            assetType = asset.type;
          } else {
            console.warn(`Asset not found for chunk ${chunk._id} with assetId ${chunk.assetId}`);
            // Provide fallback information for orphaned chunks
            assetTitle = `Deleted Asset (${chunk.assetId.substring(0, 8)}...)`;
            assetType = 'md'; // Default type for orphaned chunks
          }
        } else {
          // This is a custom user-created chunk
          isCustom = true;
        }
        
        return {
          ...chunk,
          assetTitle,
          assetType,
          isCustom,
        };
      })
    );

    return Response.json({
      ok: true,
      data: chunksWithAssets,
    } as ApiResponse<ChunkWithAsset[]>);

  } catch (error) {
    console.error('Error fetching chunks:', error);
    
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
 * POST /api/projects/[id]/chunks
 * 
 * Creates a new custom chunk for the project
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCustomChunkSchema.parse(body);

    // Create custom chunk
    const chunkId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chunk: Chunk = {
      _id: new ObjectId().toString(),
      projectId,
      assetId: '', // Empty for custom chunks
      chunkId,
      userId,
      md_text: validatedData.content,
      tokens: Math.ceil(validatedData.content.length / 4), // Rough token estimate
      section: validatedData.section || validatedData.title,
      meta: {
        hpath: [validatedData.title],
      },
      vector: false, // Custom chunks don't have embeddings by default
      createdAt: new Date(),
    };

    // Insert the chunk
    const chunksColl = await getColl<Chunk>('chunks');
    await chunksColl.insertOne(chunk);

    return Response.json({
      ok: true,
      data: {
        ...chunk,
        isCustom: true,
      },
    } as ApiResponse<ChunkWithAsset>);

  } catch (error) {
    console.error('Error creating chunk:', error);
    
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
