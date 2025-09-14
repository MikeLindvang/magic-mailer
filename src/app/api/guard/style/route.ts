import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { guardStylePrompt } from '@/lib/llm/prompts/guardStyle';

// Request schema
const GuardStyleRequestSchema = z.object({
  style_card: z.object({
    tone: z.string(),
    voice: z.string(),
    style: z.string(),
    audience: z.string(),
    guidelines: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
  }),
  draft: z.object({
    subject: z.string(),
    html: z.string(),
    md: z.string(),
    txt: z.string(),
  }),
});

type GuardStyleRequest = z.infer<typeof GuardStyleRequestSchema>;

// Response types
export interface StyleMismatch {
  area: string;
  issue: string;
  fix: string;
}

export interface GuardStyleResponse {
  ok: true;
  data: {
    mismatches: StyleMismatch[];
    overall_score: number;
    recommendations: string[];
  };
}

export interface GuardStyleErrorResponse {
  ok: false;
  error: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify(
        { ok: false, error: 'Unauthorized' } as GuardStyleErrorResponse
      ), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: GuardStyleRequest = GuardStyleRequestSchema.parse(body);

    // Call LLM to analyze style mismatches
    const analysisResult = await analyzeStyleMismatches(
      validatedData.style_card,
      validatedData.draft
    );

    return new Response(JSON.stringify({
      ok: true,
      data: analysisResult,
    } as GuardStyleResponse), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Style guard error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(
        { ok: false, error: `Validation error: ${error.issues.map(e => e.message).join(', ')}` } as GuardStyleErrorResponse
      ), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' } as GuardStyleErrorResponse
    ), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function analyzeStyleMismatches(
  styleCard: GuardStyleRequest['style_card'],
  draft: GuardStyleRequest['draft']
): Promise<{
  mismatches: StyleMismatch[];
  overall_score: number;
  recommendations: string[];
}> {
  try {
    // Get the style analysis prompt
    const prompt = guardStylePrompt(styleCard, draft);

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
            content: 'You are a style analysis expert. Analyze the provided draft against the style card and return detailed feedback in the exact JSON format requested.'
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
    const analysisText = result.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from OpenAI API');
    }

    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    // Validate the response structure
    if (!analysis.mismatches || !Array.isArray(analysis.mismatches)) {
      throw new Error('Invalid response format from LLM');
    }

    return {
      mismatches: analysis.mismatches.map((mismatch: Record<string, unknown>) => ({
        area: mismatch.area || 'Unknown',
        issue: mismatch.issue || 'No issue specified',
        fix: mismatch.fix || 'No fix suggested'
      })),
      overall_score: analysis.overall_score || 0,
      recommendations: analysis.recommendations || []
    };

  } catch (error) {
    console.error('LLM analysis error:', error);
    throw new Error(`Failed to analyze style: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
