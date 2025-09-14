import { requireUser } from '@/lib/auth/requireUser';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getColl } from '@/lib/db/mongo';
import { type UserConnection } from '@/lib/schemas/userConnection';
import { decrypt } from '@/lib/crypto/encryption';
import { createGetResponseClient, zNewsletterDraftRequest } from '@/lib/getresponse/client';
import { z } from 'zod';

/**
 * POST /api/getresponse/draft
 * 
 * Creates a newsletter draft in GetResponse using the stored API key.
 * Requires the user to have a saved GetResponse connection.
 */
export async function POST(request: Request): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = zNewsletterDraftRequest.parse(body);

    // Get user's GetResponse connection
    const userConnectionsColl = await getColl<UserConnection>('user_connections');
    const connection = await userConnectionsColl.findOne({
      userId,
      provider: 'getresponse',
    });

    if (!connection) {
      return errorResponse(
        'GetResponse connection not found. Please connect your GetResponse account first.',
        400
      );
    }

    // Decrypt the stored API key
    let apiKey: string;
    try {
      apiKey = decrypt(connection.data.encrypted);
    } catch (error) {
      console.error('Failed to decrypt GetResponse API key:', error);
      return errorResponse(
        'Failed to decrypt API key. Please reconnect your GetResponse account.',
        500
      );
    }

    // Create GetResponse client and make the API call
    const client = createGetResponseClient(apiKey);
    
    try {
      const result = await client.createNewsletterDraft(validatedData);
      
      return successResponse(result);

    } catch (error) {
      console.error('GetResponse API error:', error);
      
      // Handle specific GetResponse API errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Check for authentication errors
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid API key')) {
          return errorResponse(
            'Invalid GetResponse API key. Please reconnect your account.',
            401
          );
        }
        
        // Check for campaign/fromField not found errors
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          return errorResponse(
            'Campaign or From Field not found. Please check your campaign ID and from field ID.',
            400
          );
        }
        
        // Check for validation errors
        if (errorMessage.includes('400') || errorMessage.includes('validation')) {
          return errorResponse(
            `GetResponse validation error: ${errorMessage}`,
            400
          );
        }
        
        // Generic GetResponse API error
        return errorResponse(
          `GetResponse API error: ${errorMessage}`,
          500
        );
      }
      
      // Unknown error
      return errorResponse(
        'Failed to create newsletter draft. Please try again.',
        500
      );
    }

  } catch (error) {
    console.error('Error creating newsletter draft:', error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
