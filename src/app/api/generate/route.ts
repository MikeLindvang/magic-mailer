import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { hybridRetrieve } from '@/lib/retrieval/hybrid';
import { generateEmailPrompt, PAS_EMAIL_CONFIG } from '@/lib/llm/prompts/generate';
import { type Project } from '@/lib/schemas/project';
import { zCreateDraft, type CreateDraft } from '@/lib/schemas/draft';
import { ObjectId } from 'mongodb';

/**
 * Request schema for email generation
 */
const zGenerateRequest = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  angle: z.literal('PAS'), // Currently only supporting PAS
  audience: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  constraints: z.string().optional(),
  mustInclude: z.string().optional(),
  linkOverrides: z.record(z.string()).optional(),
  query: z.string().optional(), // Optional custom query, defaults to project name
  selectedChunkIds: z.array(z.string()).optional(), // Optional array of selected chunk IDs
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
});

type GeneratedEmail = z.infer<typeof zGeneratedEmail>;

/**
 * Response type for the generate endpoint
 */
type GenerateResponse = ApiResponse<{
  draft: CreateDraft & { _id: string };
  contextChunks: string[];
}>;

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
 * Call OpenAI API to generate email content
 */
async function generateEmailContent(prompt: string): Promise<GeneratedEmail> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PAS_EMAIL_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: prompt
        }
      ],
      max_tokens: PAS_EMAIL_CONFIG.maxTokens,
      temperature: PAS_EMAIL_CONFIG.temperature,
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
      constraints,
      mustInclude,
      linkOverrides,
      query,
      selectedChunkIds
    } = validatedRequest;

    // Get database collections
    const projectsCollection = await getColl<Project>('projects');
    const draftsCollection = await getColl('drafts');

    // Validate ObjectId format for projectId
    if (!ObjectId.isValid(projectId)) {
      return Response.json(
        { ok: false, error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    // Fetch project and verify ownership
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId), // Convert string to ObjectId
      userId // Ensure user owns the project
    });

    if (!project) {
      return Response.json(
        { ok: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Use custom query or default to project name
    const searchQuery = query || project.name;

    let retrievalResult: { chunks: Array<{ chunkId: string; score: number; md_text: string; hpath: string[]; source: string }>, contextPack: string };

    if (selectedChunkIds && selectedChunkIds.length > 0) {
      // Use selected chunks instead of hybrid search
      const chunksCollection = await getColl('chunks');
      
      // Get selected chunks by their IDs
      const selectedChunks = await chunksCollection
        .find({ 
          _id: { $in: selectedChunkIds },
          projectId,
          userId 
        })
        .toArray();

      if (selectedChunks.length === 0) {
        return Response.json(
          { ok: false, error: 'Selected chunks not found or access denied' },
          { status: 400 }
        );
      }

      // Convert to the expected format
      const formattedChunks = selectedChunks.map(chunk => ({
        chunkId: chunk.chunkId || chunk._id,
        score: 1.0, // Give selected chunks maximum relevance
        md_text: chunk.md_text,
        hpath: chunk.meta?.hpath || ['Selected Content'],
        source: 'selected' as const
      }));

      // Build context pack from selected chunks
      const contextPack = formattedChunks
        .map(chunk => {
          const pathDisplay = chunk.hpath.length > 0 
            ? ` (${chunk.hpath.join(' > ')})` 
            : '';
          return `## [${chunk.chunkId}]${pathDisplay}\n\n${chunk.md_text.trim()}\n`;
        })
        .join('\n');

      retrievalResult = {
        chunks: formattedChunks,
        contextPack
      };
    } else {
      // Use hybrid search as before
      retrievalResult = await hybridRetrieve({
        projectId,
        query: searchQuery,
        k: 8 // Get top 8 most relevant chunks
      });

      if (!retrievalResult.contextPack || retrievalResult.chunks.length === 0) {
        return Response.json(
          { ok: false, error: 'No relevant content found for email generation' },
          { status: 400 }
        );
      }
    }

    // Prepare default link with UTM parameters
    let defaultLink: string | undefined;
    if (project.default_link) {
      defaultLink = addUtmParams(project.default_link, projectId);
    }

    // Generate email prompt
    const prompt = generateEmailPrompt({
      angle,
      projectName: project.name,
      audience,
      length,
      constraints,
      mustInclude,
      contextPack: retrievalResult.contextPack,
      defaultLink
    });

    // Generate email content using LLM
    const generatedEmail = await generateEmailContent(prompt);

    // Apply link overrides if provided
    let finalHtml = generatedEmail.html;
    let finalMd = generatedEmail.md;
    let finalTxt = generatedEmail.txt;

    if (linkOverrides && Object.keys(linkOverrides).length > 0) {
      Object.entries(linkOverrides).forEach(([placeholder, url]) => {
        const regex = new RegExp(placeholder, 'g');
        finalHtml = finalHtml.replace(regex, url);
        finalMd = finalMd.replace(regex, url);
        finalTxt = finalTxt.replace(regex, url);
      });
    }

    // Create draft object
    const draftId = new ObjectId().toString();
    const now = new Date();
    
    const draft: CreateDraft = {
      projectId,
      angle,
      subject: generatedEmail.subject,
      preheader: generatedEmail.preheader,
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
      ok: true,
      data: {
        draft: {
          _id: draftId,
          ...validatedDraft
        },
        contextChunks: retrievalResult.chunks.map(chunk => chunk.chunkId)
      }
    };

    return Response.json(response);

  } catch (error) {
    console.error('Email generation error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    return Response.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Email generation failed' 
      },
      { status: 500 }
    );
  }
}
