import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { hybridRetrieve } from '@/lib/retrieval/hybrid';
import { generateEmailPrompt, getEmailConfig, getAvailableTones, getAvailableStyles } from '@/lib/llm/prompts/generate';
import { chooseBestSubject } from '@/lib/email/postProcess';
import { zCreateDraft, type CreateDraft } from '@/lib/schemas/draft';
import { type Chunk } from '@/lib/schemas/chunk';
import { ObjectId } from 'mongodb';

/**
 * Request schema for email generation
 */
const zGenerateRequest = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  angle: z.literal('PAS'), // Currently only supporting PAS
  audience: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  tone: z.enum(getAvailableTones().map(t => t.key) as [string, ...string[]]).optional(),
  style: z.enum(getAvailableStyles().map(s => s.key) as [string, ...string[]]).optional(),
  selectedChunkIds: z.array(z.string()).optional(),
  constraints: z.string().optional(),
  mustInclude: z.string().optional(),
  linkOverrides: z.record(z.string()).optional(),
  query: z.string().optional(), // Optional custom query, defaults to project name
  hypeLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});

// type GenerateRequest = z.infer<typeof zGenerateRequest>;

/**
 * Generated email response schema
 */
const zGeneratedEmail = z.object({
  subject: z.string(),
  preheader: z.string(),
  html: z.string(),
  md: z.string(),
  txt: z.string(),
  __subject_candidates: z.array(z.string()).optional(),
});

type GeneratedEmail = z.infer<typeof zGeneratedEmail>;

/**
 * Response type for the generate endpoint
 */
type GenerateResponse = {
  draft: CreateDraft & { _id: string };
  contextChunks: string[];
};

/**
 * Add UTM parameters to a URL
 */
function addUtmParams(url: string, projectId: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('utm_source', 'newsletter');
    urlObj.searchParams.set('utm_campaign', projectId);
    urlObj.searchParams.set('utm_content', 'PAS');
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to add UTM params to URL:', url, error);
    return url; // Return original URL if parsing fails
  }
}

/**
 * Prioritize chunks based on title and tag matching with the focus topic
 */
function prioritizeChunksByTopic(
  chunks: Array<{ chunkId: string; score: number; md_text: string; hpath: string[]; source: string; title?: string; tags?: string[] }>,
  focusTopic: string
): Array<{ chunkId: string; score: number; md_text: string; hpath: string[]; source: string; title?: string; tags?: string[] }> {
  // Score chunks based on title and tag matching
  const topicLower = focusTopic.toLowerCase();
  const scoredChunks = chunks.map(chunk => {
    let priorityScore = chunk.score; // Start with original score

    // Boost score for title matches
    if (chunk.title?.toLowerCase().includes(topicLower)) {
      priorityScore += 0.5; // Strong boost for title matches
    }

    // Boost score for tag matches
    if (chunk.tags && chunk.tags.length > 0) {
      const matchingTags = chunk.tags.filter(tag => 
        tag.toLowerCase().includes(topicLower)
      );
      priorityScore += matchingTags.length * 0.3; // Moderate boost per matching tag
    }

    // Boost score for content matches (already handled by hybrid search, but reinforce)
    if (chunk.md_text.toLowerCase().includes(topicLower)) {
      priorityScore += 0.2; // Small boost for content matches
    }

    return {
      ...chunk,
      score: priorityScore
    };
  });

  // Sort by priority score (highest first)
  return scoredChunks.sort((a, b) => b.score - a.score);
}

/**
 * Build context pack string with chunk headers (reused from hybrid.ts)
 */
function buildContextPack(chunks: Array<{ chunkId: string; md_text: string; hpath: string[]; title?: string; tags?: string[] }>): string {
  if (chunks.length === 0) {
    return '';
  }
  
  return chunks
    .map(chunk => {
      // Use title if available, otherwise fall back to chunkId
      const title = chunk.title || `Chunk ${chunk.chunkId}`;
      
      // Create hierarchical path display if hpath exists
      const pathDisplay = chunk.hpath.length > 0 
        ? ` (${chunk.hpath.join(' > ')})` 
        : '';
      
      // Add tags if available
      const tagDisplay = chunk.tags && chunk.tags.length > 0 
        ? `\n**Tags:** ${chunk.tags.join(', ')}` 
        : '';
      
      return `## ${title}${pathDisplay}${tagDisplay}\n\n${chunk.md_text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Call OpenAI API to generate email content
 */
async function generateEmailContent(prompt: string, config = getEmailConfig()): Promise<GeneratedEmail> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI API');
  }

  try {
    const parsed = JSON.parse(content);
    return zGeneratedEmail.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to parse generated email content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * POST /api/generate
 * 
 * Generates a PAS format email using project context and saves it as a draft
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Authenticate user
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  const { userId } = authResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = zGenerateRequest.parse(body);
    
    const {
      projectId,
      angle,
      audience,
      length,
      tone,
      style,
      selectedChunkIds,
      constraints,
      mustInclude,
      linkOverrides,
      query,
      hypeLevel,
    } = validatedRequest;

    // Get database collections
    const projectsCollection = await getColl('projects');
    const draftsCollection = await getColl('drafts');

    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return errorResponse('Invalid project ID format', 400);
    }

    // Fetch project and verify ownership
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId), // Convert string to ObjectId for query
      userId // Ensure user owns the project
    });

    if (!project) {
      return errorResponse('Project not found or access denied', 404);
    }

    // Use custom query or default to project name
    const searchQuery = query || project.name;

    let retrievalResult: { chunks: Array<{ chunkId: string; score: number; md_text: string; hpath: string[]; source: string }>, contextPack: string };

    if (selectedChunkIds && selectedChunkIds.length > 0) {
      // Use selected chunks instead of hybrid search
      const chunksCollection = await getColl<Chunk>('chunks');
      
      // Validate all chunk IDs are valid ObjectId format (even though stored as strings)
      const invalidIds = selectedChunkIds.filter(id => !ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return errorResponse(`Invalid chunk ID format: ${invalidIds.join(', ')}`, 400);
      }
      
      // Get selected chunks by their IDs
      // Note: Chunks are stored with _id as STRING (not ObjectId), selectedChunkIds are also strings
      // This was the root cause - we were converting strings to ObjectIds but chunks store _id as strings
      const selectedChunks = await chunksCollection
        .find({ 
          _id: { $in: selectedChunkIds }, // Use strings directly, no ObjectId conversion needed
          projectId, // Use string projectId for foreign key relationships
          $or: [
            { userId }, // New chunks with userId field
            { userId: { $exists: false } } // Legacy chunks without userId field
          ]
        })
        .toArray();

      if (selectedChunks.length === 0) {
        return errorResponse(
          `Selected chunks not found or access denied. Requested ${selectedChunkIds.length} chunks but found 0. This could indicate the chunks don't exist, belong to a different user, or belong to a different project.`,
          400
        );
      }
      
      // Warn if some chunks were not found
      if (selectedChunks.length < selectedChunkIds.length) {
        console.warn(`[GENERATE] Warning: Requested ${selectedChunkIds.length} chunks but only found ${selectedChunks.length}. Some chunks may have been deleted or are inaccessible.`);
      }
      
      // Debug: Log what we found vs what was requested
      console.log(`[DEBUG] Requested ${selectedChunkIds.length} chunks, found ${selectedChunks.length} chunks`);
      console.log(`[DEBUG] Requested chunk IDs:`, selectedChunkIds);
      console.log(`[DEBUG] Found chunk IDs:`, selectedChunks.map(c => c._id));
      
      // Additional debugging: Let's check what chunks exist for this project/user
      const allProjectChunks = await chunksCollection
        .find({ projectId })
        .limit(5) // Limit to avoid too much output
        .toArray();
      
      console.log(`[DEBUG] Total chunks in project:`, allProjectChunks.length);
      console.log(`[DEBUG] Sample chunks:`, allProjectChunks.map(c => ({
        _id: c._id,
        hasUserId: !!c.userId,
        userId: c.userId,
        projectId: c.projectId,
        chunkId: c.chunkId
      })));
      
      // Check if any of the requested chunks exist at all (ignoring userId)
      const chunksWithoutUserFilter = await chunksCollection
        .find({ 
          _id: { $in: selectedChunkIds }, // Use strings directly
          projectId
        })
        .toArray();
      
      console.log(`[DEBUG] Chunks found without userId filter:`, chunksWithoutUserFilter.length);
      console.log(`[DEBUG] Their userIds:`, chunksWithoutUserFilter.map(c => ({ _id: c._id, userId: c.userId })));
      console.log(`[DEBUG] Current user ID:`, userId);

      // Convert to the expected format
      const formattedChunks = selectedChunks.map(chunk => ({
        chunkId: chunk.chunkId || chunk._id,
        score: 1.0, // Give selected chunks maximum relevance
        md_text: chunk.md_text,
        hpath: chunk.meta?.hpath || ['Selected Content'],
        source: 'selected' as const
      }));

      // Build context pack from selected chunks with titles and tags
      const contextPack = formattedChunks
        .map(chunk => {
          const fullChunk = selectedChunks.find(c => c.chunkId === chunk.chunkId || c._id === chunk.chunkId);
          const title = fullChunk?.title || chunk.hpath[0] || 'Selected Content';
          const tags = fullChunk?.tags || [];
          const pathDisplay = chunk.hpath.length > 0 
            ? ` (${chunk.hpath.join(' > ')})` 
            : '';
          const tagDisplay = tags.length > 0 
            ? `\n**Tags:** ${tags.join(', ')}` 
            : '';
          
          return `## ${title}${pathDisplay}${tagDisplay}\n\n${chunk.md_text.trim()}\n`;
        })
        .join('\n');

      retrievalResult = {
        chunks: formattedChunks,
        contextPack
      };
    } else {
      // Use hybrid search with title/tag prioritization
      retrievalResult = await hybridRetrieve({
        projectId,
        query: searchQuery,
        k: 12, // Get more chunks to allow for prioritization
        userId // Pass userId for additional security
      });

      if (!retrievalResult.contextPack || retrievalResult.chunks.length === 0) {
        return errorResponse('No relevant content found for email generation', 400);
      }

      // Prioritize chunks with matching titles or tags
      if (searchQuery && searchQuery !== project.name) {
        const prioritizedChunks = prioritizeChunksByTopic(retrievalResult.chunks, searchQuery);
        retrievalResult = {
          chunks: prioritizedChunks.slice(0, 8), // Take top 8 after prioritization
          contextPack: buildContextPack(prioritizedChunks.slice(0, 8))
        };
      }
    }

    // Prepare default link with UTM parameters
    let defaultLink: string | undefined;
    if (project.default_link) {
      defaultLink = addUtmParams(project.default_link, projectId);
    }

    // Get email configuration with hype level adjustments
    const emailConfig = getEmailConfig(tone, style, hypeLevel);

    // Generate email prompt
    const prompt = generateEmailPrompt({
      angle: angle,
      projectName: project.name,
      audience: audience,
      length: length,
      tone: tone,
      style: style,
      constraints: constraints,
      mustInclude: mustInclude,
      contextPack: retrievalResult.contextPack,
      defaultLink: defaultLink,
      hypeLevel: hypeLevel
    });

    // Generate email content using LLM with enhanced configuration
    const generatedEmail = await generateEmailContent(prompt, emailConfig);

    // Re-rank subjects using the effective hype level
    const finalEmail = chooseBestSubject(generatedEmail, retrievalResult.contextPack, emailConfig.effectiveHypeLevel);

    // Apply link overrides if provided
    let finalHtml = finalEmail.html;
    let finalMd = finalEmail.md;
    let finalTxt = finalEmail.txt;

    if (linkOverrides && Object.keys(linkOverrides).length > 0) {
      Object.entries(linkOverrides).forEach(([placeholder, url]) => {
        const regex = new RegExp(placeholder, 'g');
        finalHtml = finalHtml.replace(regex, url);
        finalMd = finalMd.replace(regex, url);
        finalTxt = finalTxt.replace(regex, url);
      });
    }

    // Create draft object
    const draftId = new ObjectId();
    const now = new Date();
    
    const draft: CreateDraft = {
      projectId,
      angle,
      subject: finalEmail.subject,
      preheader: finalEmail.preheader,
      formats: {
        html: finalHtml,
        md: finalMd,
        txt: finalTxt,
      },
      context_chunk_ids: retrievalResult.chunks.map(chunk => chunk.chunkId),
      scores: {
        generation_timestamp: now.toISOString(),
        context_chunks_used: retrievalResult.chunks.length,
        search_query: searchQuery,
        retrieval_scores: retrievalResult.chunks.map(chunk => ({
          chunkId: chunk.chunkId,
          score: chunk.score,
          source: chunk.source
        }))
      }
    };

    // Validate draft before saving
    const validatedDraft = zCreateDraft.parse(draft);

    // Save draft to database
    const insertResult = await draftsCollection.insertOne({
      _id: draftId,
      ...validatedDraft,
      createdAt: now
    });

    if (!insertResult.acknowledged) {
      throw new Error('Failed to save draft to database');
    }

    // Return success response
    const response: GenerateResponse = {
      draft: {
        _id: draftId.toString(),
        ...validatedDraft
      },
      contextChunks: retrievalResult.chunks.map(chunk => chunk.chunkId)
    };

    return successResponse(response);

  } catch (error) {
    console.error('Email generation error:', error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Email generation failed',
      500
    );
  }
}
