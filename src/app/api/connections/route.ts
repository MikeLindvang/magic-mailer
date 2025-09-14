import { requireUser } from '@/lib/auth/requireUser';
import { getColl } from '@/lib/db/mongo';
import { type UserConnection } from '@/lib/schemas/userConnection';
import { successResponse, errorResponse } from '@/lib/api/response';

/**
 * GET /api/connections
 * 
 * Retrieves all connections for the authenticated user
 */
export async function GET(): Promise<Response> {
  // Require user authentication
  const authResult = await requireUser();
  if (!authResult.ok) {
    return authResult.response;
  }
  
  const { userId } = authResult;

  try {
    // Get all connections for the user
    const connectionsColl = await getColl<UserConnection>('user_connections');
    const connectionsFromDb = await connectionsColl
      .find({ userId })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Convert ObjectId to string for frontend
    const connections: UserConnection[] = connectionsFromDb.map(connection => ({
      ...connection,
      _id: connection._id.toString(),
    }));

    return successResponse(connections);

  } catch (error) {
    console.error('Error fetching connections:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
