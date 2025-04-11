import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retryableFetch } from '@/lib/retry';
import { syncSetlistFromSetlistFm } from '../../../../app/sync/setlist';

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const setlistId = searchParams.get('setlistId');

    if (!setlistId) {
      return NextResponse.json(
        { error: 'Missing setlistId parameter' },
        { status: 400 }
      );
    }

    const artistId = params.artistId;
    const result = await syncSetlistFromSetlistFm(artistId, setlistId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to sync setlist' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in setlist route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 