/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />
/// <reference types="https://deno.land/x/xhr@0.1.0/mod.ts" />
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { retry } from '../_shared/retryUtils.ts'
import { handleError, ErrorSource } from '../_shared/errorUtils.ts'
import { storeSongsInDatabase } from '../_shared/songDbUtils.ts'
import { Song, SpotifyTrack, ApiResponse, Deno } from '../_shared/types.ts'

interface SyncSongPayload {
  songId?: string;
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
}

async function getSpotifyToken(): Promise<string | null> {
  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      handleError({
        message: 'Spotify client ID or secret not configured',
        source: ErrorSource.Spotify,
        context: { hasClientId: !!clientId, hasClientSecret: !!clientSecret }
      });
      return null;
    }

    const response = await retry(
      async () => {
        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          },
          body: 'grant_type=client_credentials'
        });

        if (!res.ok) {
          throw new Error(`Failed to get Spotify token: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[getSpotifyToken] Retry attempt ${attempt}:`, error);
        }
      }
    );

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    handleError({
      message: 'Failed to get Spotify access token',
      source: ErrorSource.Spotify,
      originalError: error
    });
    return null;
  }
}

async function syncArtistSongs(supabaseAdmin: any, artistId: string, artistName: string, spotifyId?: string): Promise<void> {
  try {
    const token = await getSpotifyToken();
    if (!token) {
      handleError({
        message: 'Failed to get Spotify token for artist sync',
        source: ErrorSource.Spotify,
        context: { artistId, artistName }
      });
      return;
    }

    // If we have a Spotify ID, use it directly
    if (spotifyId) {
      const response = await retry(
        async () => {
          const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch artist top tracks: ${res.statusText}`);
          }

          return res;
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error, attempt) => {
            console.warn(`[syncArtistSongs] Retry attempt ${attempt} for ${spotifyId}:`, error);
          }
        }
      );

      const data = await response.json();
      const tracks: SpotifyTrack[] = data.tracks;

      if (tracks && tracks.length > 0) {
        await storeSongsInDatabase(artistId, tracks);
      }
      return;
    }

    // Otherwise, search for the artist first
    const searchResponse = await retry(
      async () => {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to search for artist: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[syncArtistSongs] Search retry attempt ${attempt} for ${artistName}:`, error);
        }
      }
    );

    const searchData = await searchResponse.json();
    
    if (!searchData.artists?.items?.length) {
      console.log(`No Spotify artist found for ${artistName}`);
      return;
    }

    const artist = searchData.artists.items[0];
    const artistSpotifyId = artist.id;

    const tracksResponse = await retry(
      async () => {
        const res = await fetch(
          `https://api.spotify.com/v1/artists/${artistSpotifyId}/top-tracks?market=US`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch artist top tracks: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[syncArtistSongs] Tracks retry attempt ${attempt} for ${artistSpotifyId}:`, error);
        }
      }
    );

    const tracksData = await tracksResponse.json();
    const tracks: SpotifyTrack[] = tracksData.tracks;

    if (tracks && tracks.length > 0) {
      await storeSongsInDatabase(artistId, tracks);
    }

  } catch (error) {
    handleError({
      message: 'Failed to sync artist songs',
      source: ErrorSource.Spotify,
      originalError: error,
      context: { artistId, artistName, spotifyId }
    });
    throw error;
  }
}

async function syncSingleSong(supabaseAdmin: any, songId: string): Promise<Song | null> {
  try {
    // Get existing song data
    const { data: song, error } = await supabaseAdmin
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error || !song) {
      handleError({
        message: 'Failed to fetch song data',
        source: ErrorSource.Supabase,
        originalError: error,
        context: { songId }
      });
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
    const response = await retry(
      async () => {
        const res = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });

        if (!res.ok) {
          throw new Error(`Failed to search for song: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[searchSong] Retry attempt ${attempt} for ${songId}:`, error);
        }
      }
    );

    const data = await response.json();
    const track: SpotifyTrack = data.tracks?.items?.[0];
    if (!track) return null;

    // Update song with Spotify data
    const updatedSong: Song = {
      ...song,
      spotify_id: track.id,
      updated_at: new Date().toISOString()
    };

    // Handle optional fields
    if (track.external_urls?.spotify) updatedSong.spotify_url = track.external_urls.spotify;
    if (track.preview_url !== null) updatedSong.preview_url = track.preview_url;
    if (track.duration_ms !== null) updatedSong.duration_ms = track.duration_ms;
    if (track.popularity !== null) updatedSong.popularity = track.popularity;
    if (track.album?.name) updatedSong.album_name = track.album.name;
    if (track.album?.images?.[0]?.url) updatedSong.album_image = track.album.images[0].url;

    const { error: upsertError } = await supabaseAdmin
      .from('songs')
      .upsert(updatedSong);

    if (upsertError) {
      handleError({
        message: 'Failed to upsert song',
        source: ErrorSource.Supabase,
        originalError: upsertError,
        context: { songId }
      });
      return null;
    }

    await updateSyncStatus(supabaseAdmin, songId, 'song');
    return updatedSong;
  } catch (error) {
    handleError({
      message: 'Failed to sync song',
      source: ErrorSource.API,
      originalError: error,
      context: { songId }
    });
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
      handleError({
        message: 'Failed to update sync status',
        source: ErrorSource.Supabase,
        originalError: error,
        context: { entityId, entityType }
      });
    }
  } catch (error) {
    handleError({
      message: 'Failed to update sync status',
      source: ErrorSource.API,
      originalError: error,
      context: { entityId, entityType }
    });
  }
}

serve(async (req: Request) => {
  console.log('--- sync-song function handler started ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncSongPayload = await req.json();
    const { songId, artistId, artistName, spotifyId } = payload;

    if (!songId && (!artistId || !artistName)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let song: Song | null = null;

    if (songId) {
      song = await syncSingleSong(supabaseAdmin, songId);
    } else if (artistId && artistName) {
      await syncArtistSongs(supabaseAdmin, artistId, artistName, spotifyId);
    }

    const response: ApiResponse<Song | null> = {
      success: true,
      data: song
    };

    return new Response(
      JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    handleError({
      message: 'Unhandled error in sync-song function',
      source: ErrorSource.API,
      originalError: error
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});