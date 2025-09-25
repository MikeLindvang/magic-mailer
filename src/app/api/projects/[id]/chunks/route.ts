import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Chunk } from '@/lib/schemas/chunk';
import { type Asset } from '@/lib/schemas/asset';
import { titleAndTagChunk } from '@/services/chunkLabeler';
import { callOpenAIJSON } from '@/services/providers/openaiCaller';
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
                _id: chunk.assetId, // assetId is stored as string, not ObjectId
                projectId,
              });
            } catch (error) {
              console.log(`Asset lookup failed for ${chunk.assetId}:`, error);
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

    return successResponse(chunksWithAssets);

  } catch (error) {
    console.error('Error fetching chunks:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCustomChunkSchema.parse(body);

    // Get existing chunk titles for uniqueness enforcement
    const chunksColl = await getColl<Chunk>('chunks');
    const existingChunks = await chunksColl.find({ projectId }).toArray();
    const existingTitles = new Set(existingChunks.map(c => c.title).filter(Boolean));

    // Generate title and tags using AI
    let title: string | undefined;
    let tags: string[] | undefined;
    let confidence: number | undefined;

    try {
      const labelResult = await titleAndTagChunk(validatedData.content, {
        callModel: callOpenAIJSON,
        existingTitles: Array.from(existingTitles),
        contextHint: project.title, // Use project title as context
        maxChars: 2000,
      });

      title = labelResult.title;
      tags = labelResult.tags;
      confidence = labelResult.confidence;
    } catch (error) {
      console.warn(`Failed to generate title/tags for custom chunk:`, error);
      // Fallback to using the provided title
      title = validatedData.title;
    }

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
      title,
      tags,
      confidence,
      createdAt: new Date(),
    };

    // Insert the chunk
    await chunksColl.insertOne(chunk);

    return successResponse({
      ...chunk,
      isCustom: true,
    });

  } catch (error) {
    console.error('Error creating chunk:', error);
    
    // Handle validation errors
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
