import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';

export async function GET() {
  const authResult = await requireUser();
  
  if (!authResult.ok) {
    return authResult.response;
  }

  return NextResponse.json({
    ok: true,
    data: {
      userId: authResult.userId,
      message: 'User authenticated successfully',
    },
  });
}
