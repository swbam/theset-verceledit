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

    // Store this in the database for future reference
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabase
      .from('artists')
      .update({
        spotify_id: spotifyId,
        name: artistData.name,
        image_url: artistData.images?.[0]?.url,
        spotify_url: artistData.external_urls?.spotify,
        genres: artistData.genres,
        popularity: artistData.popularity,
        followers: artistData.followers?.total,
        last_spotify_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('spotify_id', spotifyId);

    if (updateError) {
      console.error('Failed to update artist in database:', updateError);
      // Continue anyway, as we want to return the Spotify data
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