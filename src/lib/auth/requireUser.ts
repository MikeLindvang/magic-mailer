import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Server-side helper to require user authentication for API routes
 * Returns a type-safe response indicating success with userId or failure with Response
 */
export async function requireUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        ok: false,
        response: NextjsonResponse(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    return { ok: true, userId };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      ok: false,
      response: NextjsonResponse(
        { ok: false, error: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Type-safe API response format for the project
 */
export type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string };
