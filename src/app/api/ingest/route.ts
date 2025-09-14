import { z } from 'zod';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { normalizeMd } from '@/lib/ingest/md';
import { htmlToMarkdown } from '@/lib/ingest/html';
import { extractTextFromPdf } from '@/lib/ingest/pdf';
import { extractTextFromDocx } from '@/lib/ingest/docx';
import { chunkMarkdown } from '@/lib/chunking/byHeadings';
import { type Asset } from '@/lib/schemas/asset';
import { type Chunk } from '@/lib/schemas/chunk';
import { embedMany } from '@/lib/vector/embeddings';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

/**
 * Request schema for content ingestion (non-file)
 */
const IngestRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  source: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      value: z.string().min(1, 'Text content is required'),
    }),
    z.object({
      type: z.literal('url'),
      value: z.string().url('Valid URL is required'),
    }),
  ]),
  assetType: z.enum(['md', 'html']),
  title: z.string().optional(),
});

// type IngestRequest = z.infer<typeof IngestRequestSchema>;


/**
 * POST /api/ingest
 * 
 * Ingests content into the system:
 * 1. Validates user authentication
 * 2. Validates request payload (JSON or multipart form data)
 * 3. Fetches content (if URL), processes text, or processes file
 * 4. Converts to markdown format
 * 5. Chunks the content by headings
 * 6. Inserts Asset and Chunk records
 * 7. Returns asset ID and chunk count
 */
export async function POST(request: Request): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;

  try {
    const contentType = request.headers.get('content-type') || '';
    let projectId: string;
    let title: string | undefined;
    let markdown: string;
    let extractedTitle: string | undefined;
    let assetType: 'md' | 'html' | 'pdf' | 'docx';

    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      projectId = formData.get('projectId') as string;
      title = (formData.get('title') as string) || undefined;
      const file = formData.get('file') as File;

      if (!projectId) {
        return errorResponse('Project ID is required', 400);
      }

      if (!file) {
        return errorResponse('File is required', 400);
      }

      // Validate file type
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.pdf')) {
        assetType = 'pdf';
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await extractTextFromPdf(buffer);
          markdown = result.markdown;
          extractedTitle = result.title;
        } catch (error) {
          console.error('PDF processing error:', error);
          return errorResponse('Failed to process PDF file', 400);
        }
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        assetType = 'docx';
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await extractTextFromDocx(buffer);
          markdown = result.markdown;
          extractedTitle = result.title;
        } catch (error) {
          console.error('DOCX processing error:', error);
          return errorResponse('Failed to process DOCX file', 400);
        }
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        assetType = 'md';
        try {
          const text = await file.text();
          const result = normalizeMd(text);
          markdown = result.markdown;
        } catch (error) {
          console.error('Text file processing error:', error);
          return errorResponse('Failed to process text file', 400);
        }
      } else {
        return errorResponse('Unsupported file type. Please use PDF, DOCX, TXT, or MD files.', 400);
      }

    } else {
      // Handle JSON request (text/URL input)
      const body = await request.json();
      const validatedData = IngestRequestSchema.parse(body);
      
      projectId = validatedData.projectId;
      title = validatedData.title;
      assetType = validatedData.assetType;
      const source = validatedData.source;

      // Process content based on source type
      if (source.type === 'text') {
        // Handle direct text input
        if (assetType === 'html') {
          const result = htmlToMarkdown(source.value);
          markdown = result.markdown;
          extractedTitle = result.title;
        } else {
          // Normalize markdown content
          const result = normalizeMd(source.value);
          markdown = result.markdown;
        }
      } else if (source.type === 'url') {
        // Fetch content from URL
        try {
          const response = await fetch(source.value, {
            headers: {
              'User-Agent': 'MagicMailer/1.0 (Content Ingestion Bot)',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          if (!response.ok) {
            return errorResponse(`Failed to fetch URL: ${response.status} ${response.statusText}`, 400);
          }

          const contentType = response.headers.get('content-type') || '';
          
          if (!contentType.includes('text/html')) {
            return errorResponse('URL must return HTML content', 400);
          }

          const html = await response.text();
          
          // Convert HTML to markdown
          const result = htmlToMarkdown(html);
          markdown = result.markdown;
          extractedTitle = result.title;
          
        } catch (error) {
          console.error('URL fetch error:', error);
          
          // Provide more specific error messages
          let errorMessage = 'Failed to fetch URL';
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = 'Request timed out after 30 seconds. Please try a different URL.';
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
              errorMessage = 'URL not found. Please check the URL and try again.';
            } else if (error.message.includes('ECONNREFUSED')) {
              errorMessage = 'Connection refused. The server may be down.';
            } else {
              errorMessage = `Failed to fetch URL: ${error.message}`;
            }
          }
          
          return errorResponse(errorMessage, 400);
        }
      } else {
        return errorResponse('Invalid source type', 400);
      }
    }

    // Common validation and processing for both JSON and multipart requests
    // Validate ObjectId format for projectId
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
    
    // Generate content hash for deduplication
    const hash = crypto
      .createHash('sha256')
      .update(markdown)
      .digest('hex');

    // Check if asset with same hash already exists in project
    const assetsColl = await getColl<Asset>('assets');
    const existingAsset = await assetsColl.findOne({
      projectId,
      hash,
    });

    if (existingAsset) {
      // Return existing asset info
      const chunksColl = await getColl<Chunk>('chunks');
      const chunkCount = await chunksColl.countDocuments({
        projectId,
        assetId: existingAsset._id,
      });

      return successResponse({
        assetId: existingAsset._id,
        chunkCount,
      });
    }

    // Generate asset ID
    const assetId = new ObjectId().toString();
    
    // Create asset record
    const asset: Asset = {
      _id: assetId,
      projectId,
      type: assetType,
      title: title || extractedTitle || 'Untitled Document',
      parsed_md: markdown,
      hash,
      createdAt: new Date(),
    };

    // Chunk the markdown content
    const markdownChunks = chunkMarkdown(markdown);
    
    // Generate embeddings for all chunks
    console.log(`[INGEST] Processing ${markdownChunks.length} chunks for project ${projectId}`);
    const chunkTexts = markdownChunks.map(chunk => chunk.md_text);
    
    let embeddings: number[][] = [];
    try {
      console.log(`[INGEST] Generating embeddings for ${chunkTexts.length} chunks...`);
      embeddings = await embedMany(chunkTexts);
      console.log(`[INGEST] Successfully generated ${embeddings.length} embeddings`);
    } catch (error) {
      console.warn('[INGEST] Failed to generate embeddings, proceeding without them:', error);
      // Continue without embeddings rather than failing the entire ingestion
    }
    
    // Convert to database chunk format with embeddings
    const chunks: Chunk[] = markdownChunks.map((chunk, index) => ({
      _id: new ObjectId().toString(),
      projectId,
      assetId,
      chunkId: chunk.chunkId,
      userId, // Add userId to chunk for proper access control
      md_text: chunk.md_text,
      tokens: chunk.tokens,
      section: chunk.section,
      meta: chunk.meta,
      vector: embeddings.length > 0, // Set to true if we have embeddings
      embedding: embeddings[index] || undefined, // Store the embedding vector
      createdAt: new Date(),
    }));

    // Insert asset and chunks in a transaction-like manner
    // Note: MongoDB transactions require replica sets, so we'll do sequential inserts
    // In production, consider using transactions for data consistency
    
    await assetsColl.insertOne(asset);
    
    if (chunks.length > 0) {
      const chunksColl = await getColl<Chunk>('chunks');
      await chunksColl.insertMany(chunks);
    }

    // Return success response
    return successResponse({
      assetId,
      chunkCount: chunks.length,
    });

  } catch (error) {
    console.error('Ingest error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    // Handle other errors
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
