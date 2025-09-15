import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type Chunk } from '@/lib/schemas/chunk';
import { type Project } from '@/lib/schemas/project';
import { hybridRetrieve } from '@/lib/retrieval/hybrid';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Request schema for AI chunk generation
 */
const GenerateChunksRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  count: z.number().int().min(1).max(10).default(3),
  chunkType: z.enum(['introduction', 'feature', 'benefit', 'testimonial', 'cta', 'general']).default('general'),
});

/**
 * Configuration for chunk generation
 */
const CHUNK_GENERATION_CONFIG = {
  maxTokens: 1000,
  temperature: 0.8,
  model: 'gpt-4o-mini'
} as const;

/**
 * Generate chunks using OpenAI
 */
async function generateChunks(
  prompt: string, 
  count: number, 
  chunkType: string,
  contextPack?: string
): Promise<Array<{ title: string; content: string; section: string }>> {
  const systemPrompt = `You are an expert content creator specializing in email marketing chunks. Generate ${count} distinct, reusable content blocks based on the user's prompt.

${contextPack ? `## CONTEXT INFORMATION\n${contextPack}\n` : ''}

## CHUNK TYPE: ${chunkType.toUpperCase()}
${getChunkTypeGuidance(chunkType)}

## REQUIREMENTS
- Generate exactly ${count} unique chunks
- Each chunk should be 50-150 words
- Make chunks reusable across different email campaigns
- Focus on ${chunkType === 'general' ? 'versatile content' : chunkType + ' content'}
- Use engaging, conversion-focused language
- Ensure each chunk is complete and standalone

## OUTPUT FORMAT
Respond with a valid JSON array containing objects with these fields:
\`\`\`json
[
  {
    "title": "Descriptive title for the chunk (3-6 words)",
    "content": "The actual content in markdown format",
    "section": "${chunkType === 'general' ? 'Generated Content' : chunkType.charAt(0).toUpperCase() + chunkType.slice(1)}"
  }
]
\`\`\`

USER PROMPT: ${prompt}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHUNK_GENERATION_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      max_tokens: CHUNK_GENERATION_CONFIG.maxTokens,
      temperature: CHUNK_GENERATION_CONFIG.temperature,
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
    // Handle both array and object with array property
    const chunks = Array.isArray(parsed) ? parsed : parsed.chunks || [];
    
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('Invalid response format from AI');
    }

    return chunks.slice(0, count); // Ensure we don't exceed requested count
  } catch (error) {
    throw new Error(`Failed to parse generated chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get guidance text for different chunk types
 */
function getChunkTypeGuidance(chunkType: string): string {
  switch (chunkType) {
    case 'introduction':
      return '- Create engaging opening paragraphs that hook the reader\n- Focus on establishing connection and setting context\n- Use warm, welcoming tone';
    case 'feature':
      return '- Highlight specific product/service features\n- Focus on what the offering does\n- Use clear, descriptive language';
    case 'benefit':
      return '- Emphasize the value and outcomes for the customer\n- Focus on what the customer gains\n- Use benefit-driven language';
    case 'testimonial':
      return '- Create authentic-sounding customer testimonials\n- Include specific results and emotions\n- Use quotation format';
    case 'cta':
      return '- Create compelling calls-to-action\n- Use action-oriented language\n- Include urgency or value proposition';
    case 'general':
      return '- Create versatile content blocks\n- Focus on engaging, useful information\n- Make content adaptable to various contexts';
    default:
      return '- Create high-quality, engaging content\n- Focus on value for the reader\n- Use professional yet conversational tone';
  }
}

/**
 * POST /api/projects/[id]/chunks/generate
 * 
 * Generates multiple content chunks using AI based on user prompt and project context
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
    const validatedData = GenerateChunksRequestSchema.parse(body);

    // Get project context for better chunk generation
    let contextPack: string | undefined;
    try {
      const retrievalResult = await hybridRetrieve({
        projectId,
        query: validatedData.prompt,
        k: 5 // Get top 5 relevant chunks for context
      });
      
      if (retrievalResult.contextPack) {
        contextPack = retrievalResult.contextPack;
      }
    } catch (error) {
      console.warn('Failed to retrieve context for chunk generation:', error);
      // Continue without context rather than failing
    }

    // Generate chunks using AI
    const generatedChunks = await generateChunks(
      validatedData.prompt,
      validatedData.count,
      validatedData.chunkType,
      contextPack
    );

    // Create chunk records in database
    const chunksColl = await getColl<Chunk>('chunks');
    const createdChunks: Chunk[] = [];

    for (const generatedChunk of generatedChunks) {
      const chunkId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const chunk: Chunk = {
        _id: new ObjectId().toString(),
        projectId,
        assetId: '', // Empty for AI-generated chunks
        chunkId,
        userId,
        md_text: generatedChunk.content,
        tokens: Math.ceil(generatedChunk.content.length / 4), // Rough token estimate
        section: generatedChunk.section,
        meta: {
          hpath: [generatedChunk.title],
        },
        vector: false, // AI-generated chunks don't have embeddings by default
        createdAt: new Date(),
      };

      await chunksColl.insertOne(chunk);
      createdChunks.push({
        ...chunk,
        isCustom: true,
      } as Chunk & { isCustom: boolean });
    }

    return successResponse({
      chunks: createdChunks,
      message: `Generated ${createdChunks.length} chunks successfully`,
    });

  } catch (error) {
    console.error('Error generating chunks:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    // Handle OpenAI API errors
    if (error instanceof Error && error.message.includes('OpenAI API error')) {
      return errorResponse(
        'AI service temporarily unavailable. Please try again later.',
        503
      );
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate chunks',
      500
    );
  }
}
