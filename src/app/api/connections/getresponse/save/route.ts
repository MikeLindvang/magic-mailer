import { requireUser, type ApiResponse } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type UserConnection, type CreateUserConnection } from '@/lib/schemas/userConnection';
import { encrypt, maskApiKey } from '@/lib/crypto/encryption';
import { z } from 'zod';

/**
 * Request schema for saving GetResponse API key
 */
const SaveApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required').max(200, 'API key is too long'),
});

/**
 * Response type for successful API key save
 */
type SaveApiKeyResponse = {
  masked: string;
  last4: string;
};

// maskApiKey function is now imported from crypto/encryption.ts

/**
 * POST /api/connections/getresponse/save
 * 
 * Saves a GetResponse API key for the authenticated user.
 * The API key is masked for security and stored in the user_connections collection.
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
    const validatedData = SaveApiKeySchema.parse(body);
    const { apiKey } = validatedData;

    // Encrypt and mask the API key for secure storage
    const encrypted = encrypt(apiKey);
    const { masked, last4 } = maskApiKey(apiKey);

    // Get user connections collection
    const userConnectionsColl = await getColl<UserConnection>('user_connections');
    
    // Check if user already has a GetResponse connection
    const existingConnection = await userConnectionsColl.findOne({
      userId,
      provider: 'getresponse',
    });

    const now = new Date();

    if (existingConnection) {
      // Update existing connection
      await userConnectionsColl.updateOne(
        { _id: existingConnection._id },
        {
          $set: {
            data: { masked, last4, encrypted },
            updatedAt: now,
          },
        }
      );
    } else {
      // Create new connection
      const newConnection: CreateUserConnection = {
        userId,
        provider: 'getresponse',
        authType: 'apiKey',
        data: { masked, last4, encrypted },
      };

      await userConnectionsColl.insertOne({
        ...newConnection,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Return success response with masked data
    return Response.json({
      ok: true,
      data: { masked, last4 },
    } as ApiResponse<SaveApiKeyResponse>);

  } catch (error) {
    console.error('Error saving GetResponse API key:', error);
    
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
