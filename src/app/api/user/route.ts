// User route
import { requireUser } from '@/lib/auth/requireUser';
import { jsonResponse } from '@/lib/api/response';

export async function GET() {
  const authResult = await requireUser();
  
  if (!authResult.ok) {
    return authResult.response;
  }

  return jsonResponse({
    ok: true,
    data: {
      userId: authResult.userId,
      message: 'User authenticated successfully',
    },
  });
}
