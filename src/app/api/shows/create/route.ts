import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Show, Artist } from '@/lib/types';

interface VenueData {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ShowCreate {
  id?: string;
  ticketmaster_id?: string;
  name?: string;
  date: string;
  time?: string;
  artist: Artist;
  venue: VenueData;
  external_url?: string;
  image_url?: string;
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();

    if (!requestData?.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate UUID for the show if not provided
    const showId = requestData.id || randomUUID();
    
    // Create show record
    const { data: showData, error: createError } = await supabase
      .from('shows')
      .insert({
        id: showId,
        name: requestData.name,
        date: requestData.date || new Date().toISOString(),
        artist_id: requestData.artist_id,
        venue_id: requestData.venue_id,
        ticket_url: requestData.ticket_url,
        image_url: requestData.image_url,
        ticketmaster_id: requestData.ticketmaster_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (createError) {
      console.error('[API/shows/create] Error creating show:', createError);
      return NextResponse.json(
        { error: 'Failed to create show', details: createError.message },
        { status: 500 }
      );
    }

    console.log('API Route: Created show:', showData);

    // Sync the newly created show using unified-sync-v2
    if (showData.id) {
      console.log(`[API/shows/create] Syncing show ${showData.id} using unified-sync-v2`);
      
      const syncResult = await supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'show',
          entityId: showData.id,
          options: {
            forceRefresh: true
          }
        }
    });

      if (syncResult.error) {
        console.error(`[API/shows/create] Show sync failed:`, syncResult.error);
        // Continue anyway since the show was created
      } else {
        console.log(`[API/shows/create] Successfully synced show ${showData.id}`);
      }
    }

    return NextResponse.json({
      success: true, 
      message: 'Show created successfully',
      data: showData
    });

  } catch (error: any) {
    console.error('[API/shows/create] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
