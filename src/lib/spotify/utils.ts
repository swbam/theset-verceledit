
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { Json } from '@/integrations/supabase/types';
import { Buffer } from 'buffer'; // Node.js Buffer

// Safely convert stored tracks from Json to SpotifyTrack[]
export const convertStoredTracks = (storedTracks: Json | null): SpotifyTrack[] => {
  if (!storedTracks || !Array.isArray(storedTracks) || storedTracks.length === 0) {
    return [];
  }
  return storedTracks as unknown as SpotifyTrack[];
};

// Get stored tracks for an artist from database
export const getStoredTracksFromDb = async (artistId: string): Promise<SpotifyTrack[] | null> => {
  const { data: artistData, error } = await supabase
    .from('artists')
    .select('stored_tracks')
    .eq('id', artistId)
    .maybeSingle();
  
  if (error || !artistData || !artistData.stored_tracks) {
    return null;
  }
  
  return convertStoredTracks(artistData.stored_tracks);
};

// Save tracks to database for an artist
export const saveTracksToDb = async (artistId: string, tracks: SpotifyTrack[]): Promise<void> => {
  // Convert tracks to a JSON-compatible format but maintain type safety
  const tracksForStorage = tracks as unknown as Json;
  
  await supabase
    .from('artists')
    .update({ 
      stored_tracks: tracksForStorage,
      updated_at: new Date().toISOString()
    })
    .eq('id', artistId);
  
  console.log(`Stored ${tracks.length} tracks in database for artist ${artistId}`);
};

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com/api/token';

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Fetches a Spotify API access token using the client credentials flow.
 * Caches the token to avoid redundant requests.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if valid (expires 60 seconds early for safety)
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID || import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Spotify client ID or secret is not configured in environment variables.');
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to get Spotify access token (${response.status}): ${errorBody}`);
      return null;
    }

    const data = await response.json();
    const expiresIn = data.expires_in; // Typically 3600 seconds (1 hour)
    const expiresAt = now + (expiresIn * 1000);

    cachedToken = {
      token: data.access_token,
      expiresAt: expiresAt,
    };

    console.log('Successfully obtained new Spotify access token.');
    return cachedToken.token;

  } catch (error) {
    console.error('Error fetching Spotify access token:', error);
    return null;
  }
}
