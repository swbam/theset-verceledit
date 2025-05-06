import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse request body to get show information
    const showPayload = await request.json();

    if (!showPayload.id) {
      return NextResponse.json({ error: 'Missing required show ID' }, { status: 400 });
    }

    console.log(`[API/save-show] Syncing show ${showPayload.id} using unified-sync-v2`);
    
    // Use the unified-sync-v2 Edge Function for all syncing
    const syncResult = await supabase.functions.invoke('unified-sync-v2', {
      body: {
        entityType: 'show',
        entityId: showPayload.id,
        options: {
          forceRefresh: true
        }
      }
    });

    if (syncResult.error) {
      console.error(`[API/save-show] Show sync failed:`, syncResult.error);
      return NextResponse.json({ error: syncResult.error.message }, { status: 500 });
    }

    console.log(`[API/save-show] Successfully synced show ${showPayload.id}`);
    return NextResponse.json({ success: true, data: syncResult.data });
  } catch (error: any) {
    console.error('Error in save-show API route:', error);
    return NextResponse.json(
      { error: error.message || 'Error saving show' },
      { status: 500 }
    );
  }
}
