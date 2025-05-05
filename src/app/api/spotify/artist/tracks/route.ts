import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get('id');

    if (!spotifyId) {
      return NextResponse.json({ error: 'Missing Spotify ID' }, { status: 400 });
    }

    // Get Spotify access token
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

    // Get artist's top tracks
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tracksResponse.ok) {
      console.error('Failed to get Spotify artist tracks:', await tracksResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch artist tracks from Spotify API' },
        { status: 500 }
      );
    }

    const tracksData = await tracksResponse.json();
    
    // Get simplified tracks data
    const simplifiedTracks = tracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url,
      album: {
        name: track.album.name,
        image_url: track.album.images?.[0]?.url,
      }
    }));

    // Store tracks in the database for future reference
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update the artist with the stored songs
    const { error: updateError } = await supabase
      .from('artists')
      .update({
        stored_songs: simplifiedTracks,
        last_spotify_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('spotify_id', spotifyId);

    if (updateError) {
      console.error('Failed to update artist songs in database:', updateError);
      // Continue anyway, as we want to return the tracks data
    }

    return NextResponse.json(simplifiedTracks);
  } catch (error: any) {
    console.error('Error in Spotify artist tracks API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred fetching Spotify artist tracks' },
      { status: 500 }
    );
  }
} 