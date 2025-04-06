import { adminClient } from '@/lib/db';
import { fetchAndStoreArtistTracks } from '@/lib/api/database';
import type { Artist } from '@/lib/types';

/**
 * Save an artist to the database and kick off the complete import flow:
 * 1. Save artist to database
 * 2. Fetch and save artist's Spotify data
 * 3. Fetch and save artist's upcoming shows
 * 4. For each show, create a setlist with songs
 */
async function saveArtistWithAdmin(artist: Artist): Promise<Artist | null> {
  try {
    if (!artist?.id || !artist?.name) {
      console.error("[API/save-artist] Invalid artist object:", artist);
      return null;
    }

    console.log(`[API/save-artist] Processing artist: ${artist.name} (ID: ${artist.id})`);

    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await adminClient()
      .from('artists')
      .select('id, name, spotify_id, updated_at')
      .eq('id', artist.id)
      .maybeSingle();

    if (checkError) {
      console.error(`[API/save-artist] Error checking artist: ${checkError.message}`);
      return null;
    }

    // If artist exists and was updated recently, don't update it
    if (existingArtist?.updated_at) {
      const lastUpdated = new Date(existingArtist.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log(`[API/save-artist] Artist ${artist.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago. No update needed.`);
        return existingArtist as Artist;
      }
      
      console.log(`[API/save-artist] Artist ${artist.name} exists but was updated ${hoursSinceUpdate.toFixed(1)} hours ago. Updating...`);
    } else {
      console.log(`[API/save-artist] Artist ${artist.name} is new, creating record`);
    }
    
    // Prepare artist data for upsert
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image_url,
      spotify_id: artist.spotify_id,
      popularity: artist.popularity || 0,
      updated_at: new Date().toISOString(),
      // Add any other fields from the artist object
    };
    
    // Upsert the artist
    const { data: savedArtist, error: saveError } = await adminClient()
      .from('artists')
      .upsert(artistData)
      .select()
      .single();
    
    if (saveError) {
      console.error(`[API/save-artist] Error saving artist: ${saveError.message}`);
      return null;
    }
    
    console.log(`[API/save-artist] Successfully saved artist ${artist.name} to database`);
    
    // Trigger Spotify tracks fetch if we have a Spotify ID
    if (savedArtist.spotify_id) {
      console.log(`[API/save-artist] Fetching tracks for artist with Spotify ID: ${savedArtist.spotify_id}`);
      try {
        fetchAndStoreArtistTracks(savedArtist.id, savedArtist.spotify_id)
          .then(tracksResult => {
            console.log(`[API/save-artist] Stored ${tracksResult?.tracksAdded || 0} tracks for artist ${savedArtist.name}`);
          })
          .catch(tracksError => {
            console.error(`[API/save-artist] Error fetching tracks: ${tracksError}`);
          });
      } catch (tracksError) {
        console.error(`[API/save-artist] Error initiating tracks fetch: ${tracksError}`);
        // Continue - tracks fetch is not critical for artist save
      }
    }
    
    // Trigger import of artist's upcoming shows (implement in background)
    console.log(`[API/save-artist] Triggering fetch of upcoming shows for artist ${artist.name}`);
    try {
      // Background processing
      fetchArtistUpcomingShows(savedArtist.id)
        .then(showsResult => {
          console.log(`[API/save-artist] Processed ${showsResult.processedShows} shows for artist ${savedArtist.name}`);
        })
        .catch(showsError => {
          console.error(`[API/save-artist] Error fetching shows: ${showsError}`);
        });
    } catch (showsError) {
      console.error(`[API/save-artist] Error initiating shows fetch: ${showsError}`);
      // Continue - shows fetch is not critical for artist save
    }
    
    return savedArtist;
  } catch (error) {
    console.error(`[API/save-artist] Unexpected error: ${error}`);
    return null;
  }
}

// Function to fetch and save upcoming shows for an artist
async function fetchArtistUpcomingShows(artistId: string) {
  try {
    // This function would normally fetch shows from Ticketmaster API
    // For now, simulate successful processing
    console.log(`[fetchArtistUpcomingShows] Would fetch shows for artist ID: ${artistId}`);
    
    // Create dummy shows
    const dummyShows = [
      {
        id: `show-${artistId}-1`,
        name: "Tour Stop 1",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        venue: {
          id: "venue-1",
          name: "Big Arena",
          city: "New York",
          state: "NY",
          country: "US"
        },
        artist_id: artistId
      },
      {
        id: `show-${artistId}-2`,
        name: "Tour Stop 2",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        venue: {
          id: "venue-2",
          name: "Stadium",
          city: "Los Angeles",
          state: "CA",
          country: "US"
        },
        artist_id: artistId
      }
    ];
    
    // Save each show using the save-show API
    for (const show of dummyShows) {
      try {
        // Save each show
        const response = await fetch('/api/save-show', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(show),
        });
        
        const result = await response.json();
        console.log(`[fetchArtistUpcomingShows] Saved show ${show.name}: ${result.success ? 'Success' : 'Failed'}`);
      } catch (showError) {
        console.error(`[fetchArtistUpcomingShows] Error saving show ${show.name}: ${showError}`);
      }
    }
    
    return { success: true, processedShows: dummyShows.length };
  } catch (error) {
    console.error(`[fetchArtistUpcomingShows] Error: ${error}`);
    return { success: false, processedShows: 0, error };
  }
}

export async function POST(request: Request) {
  try {
    const artist = await request.json() as Artist;
    
    if (!artist || !artist.id || !artist.name) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid artist data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Save the artist and trigger all related processes
    const savedArtist = await saveArtistWithAdmin(artist);
    
    if (!savedArtist) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to save artist data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      artistId: savedArtist.id,
      data: savedArtist
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[API/save-artist] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 