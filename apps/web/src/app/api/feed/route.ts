import { NextRequest, NextResponse } from 'next/server';
import { getPublicFeed } from '@/features/feed';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get('cursor') ?? undefined;
  const takeRaw = request.nextUrl.searchParams.get('take');
  const take = takeRaw ? Number(takeRaw) : undefined;

  const data = await getPublicFeed({ cursor, take }, 'no-store');
  return NextResponse.json(data, { status: 200, headers: NO_STORE_HEADERS });
}
