import { NextRequest } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';

import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type StyleProfile } from '@/lib/schemas/styleProfile';
import { 
  createStyleAnalysisPrompt, 
  validateStyleCard,
  type EmailAnalysisInput,
  type StyleCard 
} from '@/lib/llm/prompts/styleCard';

// Input validation schema
const EmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  ctr: z.number().min(0).max(1).optional(),
  rpc: z.number().min(0).optional(),
  sentAt: z.string().datetime().optional(),
});

const BuildStyleCardSchema = z.object({
  emails: z.array(EmailSchema).min(1, 'At least one email is required').max(50, 'Maximum 50 emails allowed'),
});

type BuildStyleCardRequest = z.infer<typeof BuildStyleCardSchema>;
type BuildStyleCardResponse = ApiResponse<{ style_profile_id: string }>;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/style/build
 * 
 * Analyzes email samples using LLM to build a comprehensive style card,
 * then saves it as a style profile for the authenticated user.
 * 
 * @param request - Contains emails array with subject, body, and optional metrics
 * @returns Style profile ID for the created style card
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
    const validatedData = BuildStyleCardSchema.parse(body);
    
    console.log(`Building style card for user ${userId} with ${validatedData.emails.length} emails`);

    // Prepare emails for analysis
    const emailsForAnalysis: EmailAnalysisInput[] = validatedData.emails.map(email => ({
      subject: email.subject,
      body: email.body,
      ctr: email.ctr,
      rpc: email.rpc,
      sentAt: email.sentAt,
    }));

    // Generate style analysis prompt
    const prompt = createStyleAnalysisPrompt(emailsForAnalysis);

    // Call OpenAI to analyze style
    console.log('Requesting style analysis from OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email marketing analyst. Return only valid JSON matching the StyleCard interface.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the style card
    let styleCard: StyleCard;
    try {
      const parsedResponse = JSON.parse(responseContent);
      styleCard = validateStyleCard(parsedResponse);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid style analysis response from AI');
    }

    // Generate unique ID for the style profile
    const styleProfileId = nanoid();

    // Create style profile object
    const styleProfile: Omit<StyleProfile, '_id' | 'createdAt'> & { _id: string } = {
      _id: styleProfileId,
      ownerId: userId,
      style_card: styleCard,
      sources: validatedData.emails.map(email => `Email: ${email.subject}`),
      createdAt: new Date(),
    };

    // Save to database
    const styleProfilesCollection = await getColl<StyleProfile>('style_profiles');
    await styleProfilesCollection.insertOne(styleProfile);

    console.log(`Style profile ${styleProfileId} created successfully for user ${userId}`);

    return Response.json({
      ok: true,
      data: { style_profile_id: styleProfileId }
    });

  } catch (error) {
    console.error('Error building style card:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return Response.json({
        ok: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      }, { status: 400 });
    }

    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', error.status, error.message);
      return Response.json({
        ok: false,
        error: 'AI analysis service temporarily unavailable'
      }, { status: 503 });
    }

    // Generic error response
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to build style card'
    }, { status: 500 });
  }
}

/**
 * GET /api/style/build
 * 
 * Returns information about the style card building endpoint
 */
export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    data: {
      endpoint: '/api/style/build',
      method: 'POST',
      description: 'Build a style card from email samples using AI analysis',
      required_fields: ['emails'],
      email_fields: ['subject', 'body'],
      optional_email_fields: ['ctr', 'rpc', 'sentAt'],
      limits: {
        min_emails: 1,
        max_emails: 50
      }
    }
  });
}
