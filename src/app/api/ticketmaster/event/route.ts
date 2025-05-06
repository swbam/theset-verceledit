import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    // Get Ticketmaster event data
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${eventId}?apikey=${process.env.TICKETMASTER_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get Ticketmaster event data:', await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch event data from Ticketmaster API' },
        { status: 500 }
      );
    }

    const eventData = await response.json();

    // Find if we have a show record with this Ticketmaster ID
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: showRecord, error: lookupError } = await supabase
      .from('shows')
      .select('id, ticketmaster_id')
      .eq('ticketmaster_id', eventId)
      .single();

    let processedShowId = null;

    if (lookupError) {
      console.warn(`Show with Ticketmaster ID ${eventId} not found in database, cannot sync venue.`);
    } else if (showRecord && showRecord.id) {
      processedShowId = showRecord.id;
      
      // Use the unified-sync-v2 Edge Function to sync the show
      const { data: syncResult, error: syncError } = await supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'show',
          entityId: showRecord.id,
          options: {
            forceRefresh: true
          }
        }
      });

      if (syncError) {
        console.error('Failed to sync show via Edge Function:', syncError);
      } else {
        console.log('Successfully synced show via Edge Function:', syncResult);
      }
    }

    return NextResponse.json({
      ...eventData,
      processedShowId
    });
  } catch (error: any) {
    console.error('Error in Ticketmaster event API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred fetching Ticketmaster event data' },
      { status: 500 }
    );
  }
} 