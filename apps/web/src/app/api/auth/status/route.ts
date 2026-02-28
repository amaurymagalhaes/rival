import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  return NextResponse.json(
    { authenticated: Boolean(token || refreshToken) },
    { headers: NO_STORE_HEADERS },
  );
}
