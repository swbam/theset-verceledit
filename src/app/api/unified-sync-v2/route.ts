import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();

    const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
      body: {
        entityType: body.entityType,
        entityId: body.entityId,
        ticketmasterId: body.ticketmasterId,
        spotifyId: body.spotifyId,
        options: {
          skipDependencies: body.skipDependencies,
          forceRefresh: body.forceRefresh
        }
      }
    });

    if (error) {
      console.error('Error in unified-sync-v2 API route:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in unified-sync-v2 API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during sync' },
      { status: 500 }
    );
  }
}