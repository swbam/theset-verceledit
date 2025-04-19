/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchArtistEvents } from '../_shared/ticketmasterUtils.ts'
import { getArtistByName } from '../_shared/spotifyUtils.ts'
import { saveArtistToDatabase, saveVenueToDatabase, saveShowToDatabase } from '../_shared/databaseUtils.ts'

// Define payload types
interface SyncPayload {
  entityType: 'artist' | 'venue' | 'show' | 'song';
  entityId?: string;
  entityName?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: {
    forceRefresh?: boolean;
    skipDependencies?: boolean;
  };
}

// Main request handler
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request payload
    const payload: SyncPayload = await req.json();
    const { entityType, entityId, entityName, ticketmasterId, spotifyId, options } = payload;
    
    console.log(`Processing ${entityType} sync request`, { entityId, entityName, ticketmasterId, spotifyId });

    // Route to appropriate handler based on entity type
    let result;
    switch (entityType) {
      case 'artist':
        result = await syncArtist(supabase, { id: entityId, name: entityName, ticketmaster_id: ticketmasterId, spotify_id: spotifyId }, options);
        break;
      case 'venue':
        result = await syncVenue(supabase, { id: entityId, ticketmaster_id: ticketmasterId }, options);
        break;
      case 'show':
        result = await syncShow(supabase, { id: entityId, ticketmaster_id: ticketmasterId }, options);
        break;
      case 'song':
        result = await syncSong(supabase, { id: entityId, spotify_id: spotifyId }, options);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Artist sync handler
async function syncArtist(supabase: any, artistInput: any, options?: any) {
  console.log(`Syncing artist:`, artistInput);

  try {
    // Step 1: Find or fetch artist data
    let artist = null;
    
    // If we have an ID, try to fetch existing record
    if (artistInput.id) {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistInput.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found is okay
        throw new Error(`Error fetching artist: ${error.message}`);
      }
      
      if (data) {
        artist = data;
        console.log(`Found existing artist: ${artist.name}`);
      }
    } 
    // If we have a Ticketmaster ID but no ID, try to fetch by that
    else if (artistInput.ticketmaster_id) {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('ticketmaster_id', artistInput.ticketmaster_id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching artist by Ticketmaster ID: ${error.message}`);
      }
      
      if (data) {
        artist = data;
        console.log(`Found existing artist by Ticketmaster ID: ${artist.name}`);
      }
    }
    // If we have a Spotify ID but no ID, try to fetch by that
    else if (artistInput.spotify_id) {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('spotify_id', artistInput.spotify_id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching artist by Spotify ID: ${error.message}`);
      }
      
      if (data) {
        artist = data;
        console.log(`Found existing artist by Spotify ID: ${artist.name}`);
      }
    }

    // Step 2: If no artist found or we're forcing a refresh, get external data
    if (!artist || options?.forceRefresh) {
      // If we have a name but not a Spotify ID, search for the artist on Spotify
      if (artistInput.name && !artistInput.spotify_id) {
        try {
          const spotifyArtist = await getArtistByName(artistInput.name);
          if (spotifyArtist) {
            artistInput.spotify_id = spotifyArtist.id;
            artistInput.genres = spotifyArtist.genres;
            artistInput.popularity = spotifyArtist.popularity;
            artistInput.followers = spotifyArtist.followers?.total;
            artistInput.spotify_url = spotifyArtist.external_urls?.spotify;
          }
        } catch (error) {
          console.warn(`Could not find artist on Spotify: ${error}`);
          // Continue anyway - we don't want to fail the whole sync if just Spotify fails
        }
      }

      // Save or update artist in database
      artist = await saveArtistToDatabase({
        ...artist, // Preserve existing data if we found anything
        ...artistInput,
        updated_at: new Date().toISOString()
      });

      if (!artist) {
        throw new Error(`Failed to save artist data`);
      }
    }

    // Step 3: If we have a Ticketmaster ID, fetch upcoming shows
    const shows = [];
    if (artist.ticketmaster_id && !options?.skipDependencies) {
      try {
        const events = await fetchArtistEvents(artist.ticketmaster_id);
        console.log(`Found ${events.length} shows for artist ${artist.name}`);
        
        // Process each show and its venue
        for (const event of events) {
          // Save venue first if we have one
          let venue = null;
          if (event.venue) {
            venue = await saveVenueToDatabase(event.venue);
            if (venue) {
              console.log(`Saved venue: ${venue.name}`);
            }
          }
          
          // Then save the show
          const show = await saveShowToDatabase({
            ...event,
            artist_id: artist.id,
            venue_id: venue?.id
          });
          
          if (show) {
            shows.push(show);
            console.log(`Saved show: ${show.name} on ${new Date(show.date).toLocaleDateString()}`);
          }
        }
      } catch (error) {
        console.warn(`Error fetching shows for artist ${artist.name}: ${error}`);
        // Continue anyway - we want to return the artist even if show fetch fails
      }
    }

    return {
      artist,
      shows,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in syncArtist:`, error);
    throw error;
  }
}

// Venue sync handler  
async function syncVenue(supabase: any, venueInput: any, options?: any) {
  console.log(`Syncing venue:`, venueInput);

  try {
    // Step 1: Find or fetch venue data
    let venue = null;
    
    // If we have an ID, try to fetch existing record
    if (venueInput.id) {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueInput.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching venue: ${error.message}`);
      }
      
      if (data) {
        venue = data;
        console.log(`Found existing venue: ${venue.name}`);
      }
    } 
    // If we have a Ticketmaster ID but no ID, try to fetch by that
    else if (venueInput.ticketmaster_id) {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('ticketmaster_id', venueInput.ticketmaster_id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching venue by Ticketmaster ID: ${error.message}`);
      }
      
      if (data) {
        venue = data;
        console.log(`Found existing venue by Ticketmaster ID: ${venue.name}`);
      }
    }

    // For now, if we can't find the venue and don't have enough details, error out
    if (!venue && !venueInput.name) {
      throw new Error(`Insufficient data to sync venue: need at least name and ticketmaster_id`);
    }

    // Save or update venue in database if we have new data
    if (venueInput.name || venueInput.ticketmaster_id) {
      venue = await saveVenueToDatabase({
        ...venue, // Preserve existing data if we found anything
        ...venueInput,
        updated_at: new Date().toISOString()
      });

      if (!venue) {
        throw new Error(`Failed to save venue data`);
      }
    }

    // Return the venue data
    return {
      venue,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in syncVenue:`, error);
    throw error;
  }
}

// Show sync handler
async function syncShow(supabase: any, showInput: any, options?: any) {
  console.log(`Syncing show:`, showInput);

  try {
    // Step 1: Find or fetch show data
    let show = null;
    
    // If we have an ID, try to fetch existing record
    if (showInput.id) {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('id', showInput.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching show: ${error.message}`);
      }
      
      if (data) {
        show = data;
        console.log(`Found existing show: ${show.name}`);
      }
    } 
    // If we have a Ticketmaster ID but no ID, try to fetch by that
    else if (showInput.ticketmaster_id) {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('ticketmaster_id', showInput.ticketmaster_id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching show by Ticketmaster ID: ${error.message}`);
      }
      
      if (data) {
        show = data;
        console.log(`Found existing show by Ticketmaster ID: ${show.name}`);
      }
    }

    // For now, we'll assume show data is provided in the input
    // In a more complete implementation, we'd fetch from Ticketmaster here

    // Save or update show in database if we have enough data
    if (showInput.name && (showInput.artist_id || showInput.venue_id)) {
      show = await saveShowToDatabase({
        ...show, // Preserve existing data if we found anything
        ...showInput,
        updated_at: new Date().toISOString()
      });

      if (!show) {
        throw new Error(`Failed to save show data`);
      }
    }

    // Return the show data
    return {
      show,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in syncShow:`, error);
    throw error;
  }
}

// Song sync handler (minimal implementation)
async function syncSong(supabase: any, songInput: any, options?: any) {
  console.log(`Syncing song:`, songInput);

  // This is a minimal implementation - in reality, we'd fetch from Spotify API
  // and have more sophisticated song storage logic
  
  try {
    // Find or fetch song data
    let song = null;
    
    // If we have an ID, try to fetch existing record
    if (songInput.id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songInput.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching song: ${error.message}`);
      }
      
      if (data) {
        song = data;
        console.log(`Found existing song: ${song.name}`);
      }
    } 
    
    return {
      song,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in syncSong:`, error);
    throw error;
  }
} 