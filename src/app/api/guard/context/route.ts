import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { guardContextPrompt } from '@/lib/llm/prompts/guardContext';

// Request schema
const GuardContextRequestSchema = z.object({
  contextChunks: z.array(z.object({
    chunkId: z.string().min(1, 'Chunk ID is required'),
    md_text: z.string().min(1, 'Chunk text is required'),
  })).min(1, 'At least one context chunk is required'),
  draft: z.object({
    html: z.string().optional(),
    md: z.string().optional(),
  }).refine(
    (data) => data.html || data.md,
    { message: 'Either html or md content is required' }
  ),
});

// Response types
export interface FactualClaim {
  claim: string;
  status: 'supported' | 'unsupported';
  supporting_chunks: string[];
  evidence: string;
  confidence: number;
}

export interface ValidationSummary {
  total_claims: number;
  supported_claims: number;
  unsupported_claims: number;
  support_percentage: number;
}

export interface GuardContextResponse {
  ok: true;
  data: {
    claims: FactualClaim[];
    summary: ValidationSummary;
    recommendations: string[];
  };
}

export interface GuardContextErrorResponse {
  ok: false;
  error: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify(
        { ok: false, error: 'Unauthorized' } as GuardContextErrorResponse
      ), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = GuardContextRequestSchema.parse(body);

    // Call LLM to validate claims against context
    const validationResult = await validateClaimsAgainstContext(
      validatedData.contextChunks,
      validatedData.draft
    );

    return new Response(JSON.stringify({
      ok: true,
      data: validationResult,
    } as GuardContextResponse), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Context guard error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(
        { ok: false, error: `Validation error: ${error.issues.map(e => e.message).join(', ')}` } as GuardContextErrorResponse
      ), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' } as GuardContextErrorResponse
    ), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function validateClaimsAgainstContext(
  contextChunks: Array<{ chunkId: string; md_text: string }>,
  draft: { html?: string; md?: string }
): Promise<{
  claims: FactualClaim[];
  summary: ValidationSummary;
  recommendations: string[];
}> {
  try {
    // Get the context validation prompt
    const prompt = guardContextPrompt(contextChunks, draft);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checking expert. Analyze the provided draft against the context chunks and return detailed validation results in the exact JSON format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const validationText = result.choices[0]?.message?.content;

    if (!validationText) {
      throw new Error('No response from OpenAI API');
    }

    // Parse the JSON response
    const validation = JSON.parse(validationText);

    // Validate the response structure
    if (!validation.claims || !Array.isArray(validation.claims)) {
      throw new Error('Invalid response format from LLM: missing claims array');
    }

    if (!validation.summary || typeof validation.summary !== 'object') {
      throw new Error('Invalid response format from LLM: missing summary object');
    }

    return {
      claims: validation.claims.map((claim: Record<string, unknown>) => ({
        claim: claim.claim || 'Unknown claim',
        status: claim.status === 'supported' ? 'supported' : 'unsupported',
        supporting_chunks: Array.isArray(claim.supporting_chunks) ? claim.supporting_chunks : [],
        evidence: claim.evidence || 'No evidence provided',
        confidence: typeof claim.confidence === 'number' ? 
          Math.max(0, Math.min(1, claim.confidence)) : 0.5
      })),
      summary: {
        total_claims: validation.summary.total_claims || 0,
        supported_claims: validation.summary.supported_claims || 0,
        unsupported_claims: validation.summary.unsupported_claims || 0,
        support_percentage: validation.summary.support_percentage || 0
      },
      recommendations: Array.isArray(validation.recommendations) ? 
        validation.recommendations : []
    };

  } catch (error) {
    console.error('LLM validation error:', error);
    throw new Error(`Failed to validate context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
