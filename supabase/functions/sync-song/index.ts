/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SyncSongPayload {
  songId?: string;
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
}

interface Song {
  id: string;
  name: string;
  artist_id?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  preview_url?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  album_name?: string | null;
  album_image?: string | null;
  created_at?: string;
  updated_at?: string;
}

async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Spotify client ID or secret not configured.');
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      console.error('Failed to get Spotify token:', response.status, await response.text());
      return null;
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Spotify token:', errorMsg);
    return null;
  }
}

async function syncArtistSongs(supabaseAdmin: any, artistId: string, artistName: string, spotifyId?: string): Promise<void> {
  console.log(`Syncing songs for artist ${artistName} (ID: ${artistId})`);
  
  const spotifyToken = await getSpotifyToken();
  if (!spotifyToken) {
    console.error('Failed to get Spotify token for artist songs sync');
    return;
  }

  try {
    // If we have Spotify ID, get top tracks directly
    let tracks = [];
    if (spotifyId) {
      const topTracksUrl = `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`;
      const response = await fetch(topTracksUrl, {
        headers: { 'Authorization': `Bearer ${spotifyToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        tracks = data.tracks || [];
      }
    }

    // If no tracks found via ID or no ID provided, search by name
    if (tracks.length === 0) {
      const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artistName)}&type=track&limit=50`;
      const response = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${spotifyToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        tracks = data.tracks?.items || [];
      }
    }

    console.log(`Found ${tracks.length} songs for artist ${artistName}`);

    // Process tracks in batches
    const batchSize = 10;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      const songsToUpsert = batch.map(track => ({
        id: track.id, // Use Spotify ID as primary key
        name: track.name,
        artist_id: artistId,
        spotify_id: track.id,
        spotify_url: track.external_urls?.spotify || null,
        preview_url: track.preview_url || null,
        duration_ms: track.duration_ms || null,
        popularity: track.popularity || null,
        album_name: track.album?.name || null,
        album_image: track.album?.images?.[0]?.url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('songs')
        .upsert(songsToUpsert, { onConflict: 'spotify_id' });

      if (error) {
        console.error(`Error upserting songs batch for ${artistName}:`, error);
      } else {
        console.log(`Successfully upserted ${songsToUpsert.length} songs for ${artistName}`);
      }

      // Update sync state for each song
      for (const song of songsToUpsert) {
        await updateSyncStatus(supabaseAdmin, song.id, 'song');
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error syncing songs for artist ${artistName}:`, errorMsg);
  }
}

async function syncSingleSong(supabaseAdmin: any, songId: string): Promise<Song | null> {
  console.log(`Syncing single song ${songId}`);
  
  try {
    // Get existing song data
    const { data: song, error } = await supabaseAdmin
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error || !song) {
      console.error(`Error fetching song ${songId}:`, error?.message || 'Not found');
      return null;
    }

    // Get artist name for better Spotify search
    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('name')
      .eq('id', song.artist_id)
      .single();

    const spotifyToken = await getSpotifyToken();
    if (!spotifyToken) return null;

    // Search Spotify
    const query = artist?.name 
      ? `track:${song.name} artist:${artist.name}`
      : `track:${song.name}`;
    
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${spotifyToken}` }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const track = data.tracks?.items?.[0];
    if (!track) return null;

    // Update song with Spotify data
    const updatedSong: Song = {
      ...song,
      spotify_id: track.id,
      spotify_url: track.external_urls?.spotify || null,
      preview_url: track.preview_url || null,
      duration_ms: track.duration_ms || null,
      popularity: track.popularity || null,
      album_name: track.album?.name || null,
      album_image: track.album?.images?.[0]?.url || null,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabaseAdmin
      .from('songs')
      .upsert(updatedSong);

    if (upsertError) {
      console.error(`Error upserting song ${songId}:`, upsertError);
      return null;
    }

    await updateSyncStatus(supabaseAdmin, songId, 'song');
    return updatedSong;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error syncing song ${songId}:`, errorMsg);
    return null;
  }
}

async function updateSyncStatus(client: any, entityId: string, entityType: string) {
  try {
    const now = new Date().toISOString();
    const { error } = await client
      .from('sync_states')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        external_id: entityId,
        last_synced: now,
        sync_version: 1
      }, {
        onConflict: 'entity_id,entity_type'
      });

    if (error) {
      console.error(`Error updating sync state for ${entityType} ${entityId}:`, error);
    }
  } catch (error) {
    console.error(`Exception updating sync state for ${entityType} ${entityId}:`, error);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncSongPayload = await req.json();
    const { songId, artistId, artistName, spotifyId } = payload;

    if (!songId && (!artistId || !artistName)) {
      return new Response(JSON.stringify({ 
        error: 'Must provide either songId or both artistId and artistName' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (songId) {
      // Single song sync
      console.log(`Sync request received for song: ${songId}`);
      const song = await syncSingleSong(supabaseAdmin, songId);
      
      return new Response(JSON.stringify({ 
        success: true, 
        updated: !!song,
        data: song 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Artist songs sync
      console.log(`Sync request received for artist: ${artistName}`);
      await syncArtistSongs(supabaseAdmin, artistId!, artistName!, spotifyId);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Songs synced for artist ${artistName}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})