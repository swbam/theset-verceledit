import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get('id');

    if (!spotifyId) {
      return NextResponse.json({ error: 'Missing Spotify ID' }, { status: 400 });
    }

    // Get Spotify artist data from the API
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get Spotify access token:', await tokenResponse.text());
      return NextResponse.json(
        { error: 'Failed to authenticate with Spotify API' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Get artist data
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!artistResponse.ok) {
      console.error('Failed to get Spotify artist data:', await artistResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch artist data from Spotify API' },
        { status: 500 }
      );
    }

    const artistData = await artistResponse.json();

    // Get the artist's ID from Supabase using spotify_id
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: artistRecord, error: lookupError } = await supabase
      .from('artists')
      .select('id, spotify_id, ticketmaster_id')
      .eq('spotify_id', spotifyId)
      .single();

    if (lookupError) {
      console.error('Failed to find artist in database:', lookupError);
      return NextResponse.json(
        { error: 'Artist not found in database. Please add the artist first.' },
        { status: 404 }
      );
    }

    // Use the unified-sync-v2 Edge Function to update the artist
    if (artistRecord && artistRecord.ticketmaster_id) {
      const { data: syncResult, error: syncError } = await supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'artist',
          ticketmasterId: artistRecord.ticketmaster_id,
          spotifyId: spotifyId,
          options: {
            forceRefresh: true
          }
        }
      });

      if (syncError) {
        console.error('Failed to sync artist via Edge Function:', syncError);
        // Continue anyway to return the data
      } else {
        console.log('Successfully synced artist via Edge Function:', syncResult);
      }
    } else {
      console.warn('Could not sync artist: missing ticketmaster_id');
    }

    return NextResponse.json(artistData);
  } catch (error: any) {
    console.error('Error in Spotify artist API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred fetching Spotify artist data' },
      { status: 500 }
    );
  }
} 