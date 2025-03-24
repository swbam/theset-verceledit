import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retryableFetch } from '@/lib/retry';
import { fetchSetlistFmData, processSetlistData } from './setlist';

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// External API fetch utilities
async function fetchTicketmasterData() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error('Missing Ticketmaster API key');
  
  const response = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=100`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );
  
  if (!response.ok) {
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  
  return response.json();
}

async function fetchSpotifyData() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Spotify credentials');
  
  // Get access token
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!tokenResponse.ok) {
    throw new Error(`Spotify token error: ${tokenResponse.status}`);
  }
  
  const { access_token } = await tokenResponse.json();
  
  // Get featured playlists
  const playlistsResponse = await fetch(
    'https://api.spotify.com/v1/browse/featured-playlists?limit=50',
    {
      headers: { 'Authorization': `Bearer ${access_token}` },
      next: { revalidate: 3600 } // Cache for 1 hour
    }
  );
  
  if (!playlistsResponse.ok) {
    throw new Error(`Spotify API error: ${playlistsResponse.status}`);
  }
  
  return playlistsResponse.json();
}

// Main sync endpoint
export async function GET(request: NextRequest) {
  try {
    // Extract artist name from query params if available
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get('artist');
    
    // Check cache first
    const cacheKey = artistName 
      ? `sync_${artistName.toLowerCase()}`
      : 'sync';
      
    const { data: cachedData } = await supabase
      .from('api_cache')
      .select('data')
      .eq('endpoint', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData) {
      return NextResponse.json(cachedData.data);
    }

    // Define response data
    const responseData: {
      success: boolean;
      timestamp: string;
      services: Record<string, string>;
      errors?: Record<string, string>;
      artist?: {
        id: string;
        name: string;
        mbid?: string;
      };
    } = { 
      success: false, 
      timestamp: new Date().toISOString(),
      services: {}
    };
    
    // Parallel API calls with retry
    try {
      const tmData = await retryableFetch(() => fetchTicketmasterData(), { retries: 3 });
      await syncTicketmasterData(tmData);
      responseData.services.ticketmaster = 'success';
    } catch (error) {
      console.error('Ticketmaster Error:', error);
      responseData.services.ticketmaster = 'error';
      responseData.errors = responseData.errors || {};
      responseData.errors.ticketmaster = error instanceof Error ? error.message : String(error);
    }
    
    try {
      const spotifyData = await retryableFetch(() => fetchSpotifyData(), { retries: 3 });
      await syncSpotifyData(spotifyData);
      responseData.services.spotify = 'success';
    } catch (error) {
      console.error('Spotify Error:', error);
      responseData.services.spotify = 'error';
      responseData.errors = responseData.errors || {};
      responseData.errors.spotify = error instanceof Error ? error.message : String(error);
    }
    
    // Add Setlist.fm sync
    if (artistName) {
      try {
        responseData.services.setlistfm = 'syncing';
        
        // Get artist from database or create it
        let artistId;
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id, setlist_fm_mbid')
          .eq('name', artistName)
          .single();
          
        if (existingArtist) {
          artistId = existingArtist.id;
        } else {
          // Create artist
          const { data: newArtist, error: artistError } = await supabase
            .from('artists')
            .insert({
              name: artistName,
              last_updated: new Date().toISOString()
            })
            .select('id')
            .single();
            
          if (artistError) throw artistError;
          artistId = newArtist.id;
        }
        
        // Fetch and process setlist data
        const setlistData = await fetchSetlistFmData(artistName);
        await processSetlistData(artistId, setlistData.setlists);
        
        responseData.services.setlistfm = 'success';
        responseData.artist = {
          id: artistId,
          name: artistName,
          mbid: setlistData.mbid
        };
      } catch (error) {
        console.error('Setlist.fm Error:', error);
        responseData.services.setlistfm = 'error';
        responseData.errors = responseData.errors || {};
        responseData.errors.setlistfm = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Set overall success flag
    responseData.success = Object.values(responseData.services).some(status => status === 'success');

    // Cache response for 15 minutes
    await supabase
      .from('api_cache')
      .upsert({
        endpoint: cacheKey,
        data: responseData,
        expires_at: new Date(Date.now() + 900000).toISOString() // 15 min cache
      });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Sync Error:', error);
    
    // Log the error to the database
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'sync',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Database sync functions - split into separate methods
async function syncTicketmasterData(tmData: Record<string, unknown>) {
  // Start a database transaction for atomic updates
  const { error: txError } = await supabase.rpc('begin_transaction');
  if (txError) throw txError;
  
  try {
    // Sync artists
    if (tmData?._embedded?.events) {
      for (const event of tmData._embedded.events) {
        if (event?._embedded?.attractions) {
          for (const artist of event._embedded.attractions) {
            const { error: artistError } = await supabase
              .from('artists')
              .upsert({
                name: artist.name,
                ticketmaster_id: artist.id,
                image_url: artist.images?.[0]?.url,
                last_updated: new Date().toISOString()
              }, { onConflict: 'name' });
              
            if (artistError) throw artistError;
          }
        }
        
        // Sync shows
        const { data: artistData } = await supabase
          .from('artists')
          .select('id, name')
          .eq('name', event._embedded?.attractions?.[0]?.name)
          .single();
          
        if (artistData) {
          const { error: showError } = await supabase
            .from('shows')
            .upsert({
              artist_id: artistData.id,
              date: event.dates?.start?.dateTime || new Date().toISOString(),
              venue: event._embedded?.venues?.[0]?.name || 'Unknown Venue',
              city: event._embedded?.venues?.[0]?.city?.name || 'Unknown City',
              ticketmaster_id: event.id,
              last_updated: new Date().toISOString()
            }, { onConflict: 'ticketmaster_id' });
            
          if (showError) throw showError;
        }
      }
    }
    
    // Commit the transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    if (commitError) throw commitError;
    
    return true;
  } catch (error) {
    // Rollback on error
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}

async function syncSpotifyData(spotifyData: Record<string, unknown>) {
  try {
    // Process Spotify data for featured playlists
    if (spotifyData?.playlists?.items) {
      console.log(`Processing ${spotifyData.playlists.items.length} Spotify playlists`);
      
      for (const playlist of spotifyData.playlists.items) {
        if (!playlist.id || !playlist.name) continue;
        
        // Extract artist names from playlist title (common format: "This is Artist Name")
        const possibleArtistName = playlist.name.replace('This is ', '').trim();
        
        // Find if this artist exists in our database
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id, spotify_id')
          .ilike('name', possibleArtistName)
          .maybeSingle();
          
        if (existingArtist) {
          // Fetch top tracks for this artist
          const spotifyKey = process.env.SPOTIFY_CLIENT_ID;
          const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET;
          
          if (!spotifyKey || !spotifySecret) {
            console.error('Missing Spotify credentials');
            continue;
          }
          
          // Get API token
          const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${spotifyKey}:${spotifySecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
          });
          
          if (!tokenRes.ok) {
            console.error(`Spotify token error: ${tokenRes.status}`);
            continue;
          }
          
          const { access_token } = await tokenRes.json();
          
          // Get top tracks
          const tracksRes = await fetch(
            `https://api.spotify.com/v1/artists/${existingArtist.spotify_id}/top-tracks?market=US`,
            {
              headers: { 'Authorization': `Bearer ${access_token}` }
            }
          );
          
          if (!tracksRes.ok) {
            console.error(`Failed to fetch tracks: ${tracksRes.status}`);
            continue;
          }
          
          const tracksData = await tracksRes.json();
          
          if (tracksData?.tracks && Array.isArray(tracksData.tracks)) {
            // Store these tracks in the songs table
            for (const track of tracksData.tracks) {
              const { error: songError } = await supabase
                .from('songs')
                .upsert({
                  name: track.name,
                  artist_id: existingArtist.id,
                  spotify_id: track.id,
                  duration_ms: track.duration_ms,
                  popularity: track.popularity || 0,
                  preview_url: track.preview_url
                }, { onConflict: 'spotify_id' });
                
              if (songError) {
                console.error(`Error storing track: ${songError.message}`);
              }
            }
            
            console.log(`Stored ${tracksData.tracks.length} tracks for artist ${possibleArtistName}`);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing Spotify data:', error);
    return false;
  }
} 