import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/integrations/supabase/utils';
import { SyncManager } from '@/lib/syncManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get provider token for Spotify API calls
    const providerToken = session.provider_token;
    
    if (!providerToken) {
      return res.status(400).json({ error: 'No Spotify token available. Please reconnect your Spotify account.' });
    }

    // Get the operation from the request body
    const { operation } = req.body;

    switch (operation) {
      case 'sync_top_artists':
        // Fetch top artists from Spotify
        const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term', {
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          // If token expired, try to refresh it
          if (response.status === 401) {
            return res.status(401).json({ 
              error: 'Spotify token expired', 
              needsReauth: true 
            });
          }
          throw new Error(`Spotify API error: ${response.statusText}`);
        }

        const data = await response.json();
        const artists = data.items || [];

        // Queue sync tasks for each artist
        const syncPromises = artists.map(async (artist: any) => {
          // First check if artist exists in our database
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('id')
            .eq('spotify_id', artist.id)
            .single();

          if (existingArtist) {
            // Artist exists, queue a sync task
            return SyncManager.queueBackgroundSync('artist', existingArtist.id, {
              priority: 'normal',
              entityName: artist.name
            });
          } else {
            // Artist doesn't exist, create it first
            const { data: newArtist, error } = await supabase
              .from('artists')
              .insert({
                name: artist.name,
                spotify_id: artist.id,
                spotify_url: artist.external_urls?.spotify,
                image_url: artist.images?.[0]?.url,
                genres: artist.genres,
                popularity: artist.popularity,
                followers: artist.followers?.total
              })
              .select('id')
              .single();

            if (error) throw error;

            // Queue a sync task for the new artist
            return SyncManager.queueBackgroundSync('artist', newArtist.id, {
              priority: 'high',
              entityName: artist.name
            });
          }
        });

        // Wait for all sync tasks to be queued
        await Promise.all(syncPromises);

        // Process background tasks immediately
        SyncManager.processBackgroundTasks(5).catch(error => {
          console.error('Error processing background tasks:', error);
        });

        return res.status(200).json({ 
          success: true, 
          message: `Synced ${artists.length} top artists from Spotify`,
          artistCount: artists.length
        });

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Error in spotify-sync API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
}
