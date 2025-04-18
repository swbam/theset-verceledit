import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface SpotifySyncRequest extends NextApiRequest {
  body: {
    userId: string;
  };
}

type SyncResponse = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};

// Create Supabase client with service role key for admin operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req: SpotifySyncRequest, res: NextApiResponse<SyncResponse>) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    console.log(`[API] Syncing Spotify data for user ${userId}`);

    // Get user's session to retrieve Spotify access token
    const { data, error: sessionError } = await adminSupabase.auth.admin.getUserById(userId);

    if (sessionError || !data?.user) {
      console.error('[API] Error getting user session:', sessionError);
      return res.status(401).json({ 
        success: false, 
        error: sessionError?.message || 'User session not found' 
      });
    }

    // Check if we have a provider token (Spotify access token)
    if (!data.user.app_metadata?.provider_token) {
      console.error('[API] No provider token available');
      return res.status(400).json({ 
        success: false, 
        error: 'No Spotify access token available. Please reconnect your Spotify account.'
      });
    }

    // Fetch top artists from Spotify
    const spotifyArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=20', {
      headers: {
        'Authorization': `Bearer ${data.user.app_metadata.provider_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!spotifyArtistsResponse.ok) {
      const spotifyError = await spotifyArtistsResponse.text();
      console.error('[API] Spotify API error:', spotifyError);
      
      return res.status(500).json({ 
        success: false, 
        error: `Spotify API error: ${spotifyArtistsResponse.status} ${spotifyError}` 
      });
    }

    const spotifyData = await spotifyArtistsResponse.json();
    const topArtists = spotifyData.items || [];

    // Transform the Spotify artists data
    const artists = topArtists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url || null,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      spotify_url: artist.external_urls?.spotify || null
    }));

    console.log(`[API] Successfully retrieved ${artists.length} top artists from Spotify for user ${userId}`);

    // Send each artist to be synced in the background
    artists.forEach(async (artist: any) => {
      try {
        // Call the sync API endpoint for each artist
        await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'artist',
            artistId: artist.id
          })
        });
      } catch (error) {
        console.error(`[API] Error queueing sync for artist ${artist.name}:`, error);
      }
    });

    return res.status(200).json({ 
      success: true,
      message: `Successfully retrieved ${artists.length} top artists from Spotify`,
      data: { artists }
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API] Unhandled exception in Spotify sync API:', errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
