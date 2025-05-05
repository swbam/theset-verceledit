import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchSpotifyArtist, fetchSpotifyArtistSongs, fetchTicketmasterShows, extractVenueFromShow, fetchTicketmasterVenue } from './api.ts';

interface SyncOptions {
  skipDependencies?: boolean;
  forceRefresh?: boolean;
}

interface SyncRequest {
  entityType: 'artist' | 'show' | 'venue';
  entityId?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: SyncOptions;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY');
const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

console.log(`[unified-sync-v2] Env Vars Check:`);
console.log(`  SUPABASE_URL: ${supabaseUrl ? 'Present' : 'MISSING!'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Present' : 'MISSING!'}`);
console.log(`  TICKETMASTER_API_KEY: ${ticketmasterApiKey ? 'Present' : 'MISSING!'}`);
console.log(`  SPOTIFY_CLIENT_ID: ${spotifyClientId ? 'Present' : 'MISSING!'}`);
console.log(`  SPOTIFY_CLIENT_SECRET: ${spotifyClientSecret ? 'Present' : 'MISSING!'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[unified-sync-v2] CRITICAL: Supabase URL or Service Role Key is missing. Function cannot proceed.');
  // Early exit or throw might be appropriate here depending on desired behavior
  // For now, let it proceed to potentially fail later, but log the critical issue.
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function syncArtist(
  ticketmasterId: string,
  spotifyId?: string,
  options: SyncOptions = {}
) {
  console.log(`[unified-sync-v2] Syncing artist with Ticketmaster ID: ${ticketmasterId}`);
  
  try {
    // 1. Get the internal Artist UUID based on the Ticketmaster ID
    const { data: artistData, error: artistFetchError } = await supabase
      .from('artists')
      .select('id') // Select the primary UUID key
      .eq('ticketmaster_id', ticketmasterId)
      .single();

    if (artistFetchError || !artistData?.id) {
      console.error(`[unified-sync-v2] Error fetching artist UUID for TM ID ${ticketmasterId}:`, artistFetchError);
      throw new Error(`Could not find artist with Ticketmaster ID ${ticketmasterId} to link shows.`);
    }
    const artistUuid = artistData.id;
    console.log(`[unified-sync-v2] Found artist UUID: ${artistUuid} for TM ID: ${ticketmasterId}`);

    // Update sync status to 'syncing'
    await supabase
      .from('artists')
      .update({
        sync_status: { ticketmaster: 'syncing', spotify: spotifyId ? 'syncing' : 'pending' },
        last_sync: new Date().toISOString()
      })
      .eq('ticketmaster_id', ticketmasterId);

    // Fetch shows from Ticketmaster
    const shows = await fetchTicketmasterShows(ticketmasterId, Deno.env.get('TICKETMASTER_API_KEY')!);
    console.log(`[unified-sync-v2] Found ${shows.length} shows for artist`);

    // Process each show and its venue
    for (const show of shows) {
      // Extract and upsert venue
      const venue = extractVenueFromShow(show);
      let venueUuid: string | null = null; // Variable to hold the venue's UUID
      if (venue) {
        const { data: upsertedVenue, error: venueError } = await supabase
          .from('venues')
          .upsert({
            // Map tm_venue_id from API to ticketmaster_id in DB
            ticketmaster_id: venue.tm_venue_id,
            name: venue.name,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            address: venue.address,
            postal_code: venue.postal_code,
            latitude: venue.latitude,
            longitude: venue.longitude,
            url: venue.url,
            image_url: venue.image_url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'ticketmaster_id' // Use the correct constraint name
          })
          .select('id') // Select the primary UUID key after upsert
          .single();

        if (venueError) {
          console.error(`[unified-sync-v2] Error upserting venue (TM ID: ${venue.tm_venue_id}):`, venueError);
          // Continue to next show if venue fails
        } else if (upsertedVenue?.id) {
           venueUuid = upsertedVenue.id; // Store the venue's primary UUID
           console.log(`[unified-sync-v2] Upserted venue ${venue.name}, got UUID: ${venueUuid}`);
        } else {
           console.warn(`[unified-sync-v2] Venue upsert for ${venue.name} did not return an ID.`);
        }
      }

      // Upsert show, linking via UUIDs
      const { error: showError } = await supabase
        .from('shows')
        .upsert({
          ticketmaster_id: show.id,
          name: show.name,
          date: show.dates?.start?.dateTime || show.dates?.start?.localDate,
          image_url: show.images?.[0]?.url,
          ticket_url: show.url,
          url: show.url,
          status: show.dates?.status?.code,
          artist_id: artistUuid, // Use the fetched artist UUID
          venue_id: venueUuid, // Use the fetched venue UUID (can be null)
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ticketmaster_id' // Use Ticketmaster ID for conflict resolution
        });

      if (showError) {
        console.error(`[unified-sync-v2] Error upserting show:`, showError);
      }
    }

    // If we have a Spotify ID and it's not being skipped, sync Spotify data
    let spotifyData = null;
    let spotifySongs = null;
    
    if (spotifyId && !options.skipDependencies) {
      // Get Spotify access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
        },
        body: 'grant_type=client_credentials'
      });

      const { access_token } = await tokenResponse.json();

      // Fetch artist data and songs in parallel
      [spotifyData, spotifySongs] = await Promise.all([
        fetchSpotifyArtist(spotifyId, access_token),
        fetchSpotifyArtistSongs(spotifyId, access_token)
      ]);
    }

    // Upsert Spotify songs into the 'songs' table if fetched
    let fetchedSongsCount = 0;
    if (spotifySongs && !options.skipDependencies) {
      console.log(`[unified-sync-v2] Upserting ${spotifySongs.length} fetched Spotify songs to 'songs' table for artist ${artistUuid}`);
      const songsToUpsert = spotifySongs.map(song => ({
        spotify_id: song.id,
        artist_id: artistUuid, // Link to the artist
        name: song.name,
        duration_ms: song.duration_ms,
        popularity: song.popularity,
        // updated_at will be set by default or trigger
      }));

      // Batch upsert songs based on spotify_id and artist_id 
      // Need a unique constraint on (spotify_id, artist_id) or handle conflicts appropriately
      // Assuming a constraint named 'songs_spotify_id_artist_id_key' exists
      const { count, error: songUpsertError } = await supabase
        .from('songs')
        .upsert(songsToUpsert, { 
           onConflict: 'spotify_id, artist_id',
           ignoreDuplicates: false // Ensure data like popularity is updated
         })
        .select({ count: 'exact' }); // Get the count of affected rows

      if (songUpsertError) {
        console.error(`[unified-sync-v2] Error upserting songs for artist ${artistUuid}:`, songUpsertError);
        // Decide if this should be a partial failure or block the entire artist sync
        // For now, log the error and continue, but don't mark spotify sync as success
      } else {
         fetchedSongsCount = count ?? 0;
         console.log(`[unified-sync-v2] Successfully upserted ${fetchedSongsCount} songs for artist ${artistUuid}.`);
      }
    }

    // Update artist with all synced data
    const { error: artistError } = await supabase
      .from('artists')
      .update({
        sync_status: {
          ticketmaster: 'success',
          spotify: spotifyData ? 'success' : 'pending'
        },
        upcoming_shows_count: shows.length,
        name: spotifyData?.name,
        image_url: spotifyData?.images?.[0]?.url,
        spotify_url: spotifyData?.external_urls?.spotify,
        genres: spotifyData?.genres,
        popularity: spotifyData?.popularity,
        followers: spotifyData?.followers?.total,
        last_sync: new Date().toISOString(),
        last_spotify_sync: spotifyData ? new Date().toISOString() : undefined,
        last_ticketmaster_sync: new Date().toISOString()
      })
      .eq('ticketmaster_id', ticketmasterId);

    if (artistError) {
      console.error(`[unified-sync-v2] Error updating artist:`, artistError);
      throw artistError;
    }

    return { 
      success: true,
      showsCount: shows.length,
      songsCount: spotifySongs?.length || 0
    };
  } catch (err) {
    console.error(`[unified-sync-v2] Error syncing artist:`, err);
    
    const error = err as Error;
    
    // Update sync status to error
    await supabase
      .from('artists')
      .update({
        sync_status: { 
          ticketmaster: 'error',
          spotify: spotifyId ? 'error' : 'pending'
        },
        last_sync_error: error.message || 'Unknown error occurred'
      })
      .eq('ticketmaster_id', ticketmasterId);

    throw new Error(`Artist sync failed: ${error.message || 'Unknown error occurred'}`);
  }
}

async function syncShow(
  showId: string,
  options: SyncOptions = {}
) {
  console.log(`[unified-sync-v2] Syncing show with ID: ${showId}`);
  
  try {
    // 1. Get the show details including its artist ID
    const { data: showData, error: showFetchError } = await supabase
      .from('shows')
      .select('id, ticketmaster_id, artist_id, name, venue_id')
      .eq('id', showId)
      .single();

    if (showFetchError || !showData) {
      console.error(`[unified-sync-v2] Error fetching show with ID ${showId}:`, showFetchError);
      throw new Error(`Could not find show with ID ${showId}`);
    }
    
    if (!showData.artist_id) {
       console.warn(`[unified-sync-v2] Show ${showId} has no associated artist_id. Cannot fetch suggestions.`);
       // Update status to success but note the missing link
       await supabase
         .from('shows')
         .update({
           sync_status: 'success',
           last_sync: new Date().toISOString(),
           // Potentially add a note or clear suggestions if needed
         })
         .eq('id', showId);
       return { success: true, message: "Show synced, but no artist linked for suggestions." };
    }

    // Update sync status to 'syncing'
    await supabase
      .from('shows')
      .update({
        sync_status: 'syncing',
        last_sync: new Date().toISOString()
      })
      .eq('id', showId);

    // Get artist information to fetch additional data (specifically spotify_id)
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('id, spotify_id, name') // Fetch spotify_id
      .eq('id', showData.artist_id)
      .single();
      
    if (artistError || !artistData) {
      console.error(`[unified-sync-v2] Error fetching artist ${showData.artist_id} for show ${showId}:`, artistError);
      // Update show sync status to error
      await supabase
        .from('shows')
        .update({ sync_status: 'error', last_sync_error: `Failed to fetch artist: ${artistError?.message}` })
        .eq('id', showId);
      throw new Error(`Failed to fetch artist ${showData.artist_id} for show ${showId}`);
    }
    
    const artistUuid = artistData.id;
    let setlistSuggestions: any[] = []; // Use 'any' for now, define type later
    let syncStatus: 'success' | 'error' = 'success';
    let syncError: string | null = null;
    let songsSource: 'db' | 'spotify' | 'none' = 'none';

    // 1. Try fetching songs from our database first
    console.log(`[unified-sync-v2] Attempting to fetch songs from DB for artist ${artistUuid}`);
    const { data: dbSongs, error: dbSongsError } = await supabase
      .from('songs')
      .select('id, name, spotify_id, popularity') // Select UUID (id) and other needed fields
      .eq('artist_id', artistUuid)
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(50); // Limit suggestions for performance
      
    if (dbSongsError) {
         console.error(`[unified-sync-v2] Error fetching songs from DB for artist ${artistUuid}:`, dbSongsError);
         // Log the error but attempt fallback to Spotify if possible
    }
    
    if (dbSongs && dbSongs.length > 0) {
        console.log(`[unified-sync-v2] Found ${dbSongs.length} songs in DB for artist ${artistUuid}. Using DB songs for suggestions.`);
        songsSource = 'db';
        setlistSuggestions = dbSongs.map((song, index) => ({
          song_id: song.id, // Use the song UUID from our DB
          name: song.name,
          order: index + 1,
          encore: false, // Default value
          // Add other relevant fields if needed
        }));
        
    } else if (artistData.spotify_id && spotifyClientId && spotifyClientSecret) {
        // 2. Fallback to Spotify if no DB songs found and we have Spotify ID/credentials
        console.log(`[unified-sync-v2] No songs found in DB for artist ${artistUuid}. Falling back to Spotify ID: ${artistData.spotify_id}.`);
        songsSource = 'spotify';
        try {
            // Get Spotify access token (moved inside fallback block)
            const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
              },
              body: 'grant_type=client_credentials'
            });
            // Add error handling for token fetch
            if (!tokenResponse.ok) {
               const errorText = await tokenResponse.text();
               throw new Error(`Spotify token fetch failed: ${tokenResponse.status} ${errorText}`);
            }
            const { access_token, error: tokenError } = await tokenResponse.json();
            if (tokenError) {
                throw new Error(`Spotify token fetch returned error: ${tokenError}`);
            }
            if (!access_token) {
                 throw new Error('Spotify access token not received.');
            }
            
            const spotifySongs = await fetchSpotifyArtistSongs(artistData.spotify_id, access_token);
            
            if (spotifySongs && spotifySongs.length > 0) {
                // Save fetched Spotify songs to our DB
                console.log(`[unified-sync-v2] Upserting ${spotifySongs.length} fetched Spotify songs to 'songs' table for artist ${artistUuid}`);
                const songsToUpsert = spotifySongs.map(song => ({
                  spotify_id: song.id,
                  artist_id: artistUuid, 
                  name: song.name,
                  duration_ms: song.duration_ms,
                  popularity: song.popularity,
                }));

                const { count, error: songUpsertError } = await supabase
                  .from('songs')
                  .upsert(songsToUpsert, { 
                     onConflict: 'spotify_id, artist_id', 
                     ignoreDuplicates: false 
                   })
                  .select({ count: 'exact' });
    
                if (songUpsertError) {
                  console.error(`[unified-sync-v2] Error upserting fallback Spotify songs for artist ${artistUuid}:`, songUpsertError);
                  // Log error but continue generating suggestions from Spotify data
                } else {
                   console.log(`[unified-sync-v2] Successfully upserted ${count ?? 0} fallback Spotify songs for artist ${artistUuid}.`);
                }
                
                // Generate suggestions from the fetched Spotify data for this run
                setlistSuggestions = spotifySongs.map((song, index) => ({
                   spotify_id: song.id, // Use spotify_id as identifier for suggestions in this case
                   name: song.name,
                   order: index + 1,
                   encore: false, 
                }));
                console.log(`[unified-sync-v2] Generated ${setlistSuggestions.length} suggestions from Spotify fallback for show ${showId}`);
            } else {
                console.log(`[unified-sync-v2] Spotify fallback found no songs for artist ${artistData.spotify_id}.`);
                setlistSuggestions = [];
            }

        } catch (spotifyErr: any) {
            console.error(`[unified-sync-v2] Error during Spotify fallback for show ${showId}:`, spotifyErr);
            syncStatus = 'error';
            syncError = `Spotify fallback failed: ${spotifyErr.message}`;
            setlistSuggestions = []; // Ensure suggestions are empty on error
        }
    } else {
        // 3. No DB songs and no Spotify ID or credentials
        console.warn(`[unified-sync-v2] No songs found in DB and no Spotify ID available for artist ${artistUuid}. Cannot generate suggestions for show ${showId}.`);
        songsSource = 'none';
        setlistSuggestions = [];
    }
    
    // Update the show record with suggestions and final sync status
    const { error: updateError } = await supabase
      .from('shows')
      .update({
        setlist_suggestions: setlistSuggestions,
        sync_status: syncStatus,
        last_sync: new Date().toISOString(),
        last_sync_error: syncError
      })
      .eq('id', showId);

    if (updateError) {
      console.error(`[unified-sync-v2] CRITICAL: Failed to update show ${showId} final status:`, updateError);
      // Even if the final update fails, we should still throw based on earlier errors if they occurred
      if (syncStatus === 'error') {
         throw new Error(syncError || 'Show sync failed and final status update also failed.');
      }
      throw new Error(`Show sync succeeded but failed to update final status: ${updateError.message}`);
    }
    
    if (syncStatus === 'error') {
        throw new Error(syncError || 'Show sync failed with an unknown error during song fetching.');
    }

    console.log(`[unified-sync-v2] Successfully synced show ${showId}. Suggestions generated: ${setlistSuggestions.length > 0}`);
    return { success: true, suggestionsGenerated: setlistSuggestions.length > 0 };

  } catch (err: any) {
     console.error(`[unified-sync-v2] Overall error syncing show ${showId}:`, err);
     // Attempt to mark the show as error if not already handled
     try {
       await supabase
         .from('shows')
         .update({ 
            sync_status: 'error', 
            last_sync_error: err.message || 'Unknown error',
            last_sync: new Date().toISOString()
          })
         .eq('id', showId);
     } catch (finalUpdateError: any) {
         console.error(`[unified-sync-v2] Failed to update show ${showId} with final error status:`, finalUpdateError);
     }
     
     // Re-throw the original error to be caught by the main handler
     throw err; 
  }
}

async function syncVenue(
  venueId: string, // This is our internal UUID
  options: SyncOptions = {}
) {
  console.log(`[unified-sync-v2] Syncing venue with internal ID: ${venueId}`);
  let syncStatus: 'success' | 'error' | 'syncing' = 'syncing';
  let syncError: string | null = null;
  let venueTmId: string | null = null;

  try {
    // 1. Get the venue details including its ticketmaster_id
    const { data: venueData, error: venueFetchError } = await supabase
      .from('venues')
      .select('id, ticketmaster_id, name') // Fetch the TM ID
      .eq('id', venueId)
      .single();

    if (venueFetchError || !venueData) {
      console.error(`[unified-sync-v2] Error fetching venue with ID ${venueId}:`, venueFetchError);
      throw new Error(`Could not find venue with ID ${venueId}`);
    }
    
    venueTmId = venueData.ticketmaster_id;
    console.log(`[unified-sync-v2] Found venue: ${venueData.name}, TM ID: ${venueTmId}`);

    // Update sync status to 'syncing'
    await supabase
      .from('venues')
      .update({ sync_status: 'syncing', last_sync: new Date().toISOString() })
      .eq('id', venueId);

    // 2. If Ticketmaster ID exists, fetch updated data from Ticketmaster
    let updatedVenueData = {};
    if (venueTmId && ticketmasterApiKey) {
        console.log(`[unified-sync-v2] Fetching updated data from Ticketmaster for venue TM ID: ${venueTmId}`);
        const tmVenueData = await fetchTicketmasterVenue(venueTmId, ticketmasterApiKey);

        if (tmVenueData) {
            console.log(`[unified-sync-v2] Received data from Ticketmaster for venue: ${tmVenueData.name}`);
            // Map TM data to our schema
            updatedVenueData = {
              name: tmVenueData.name,
              city: tmVenueData.city?.name,
              state: tmVenueData.state?.name,
              country: tmVenueData.country?.code,
              address: tmVenueData.address?.line1,
              postal_code: tmVenueData.postalCode,
              latitude: tmVenueData.location?.latitude,
              longitude: tmVenueData.location?.longitude,
              url: tmVenueData.url,
              image_url: tmVenueData.images?.[0]?.url,
              // Note: ticketmaster_id should NOT be updated here, only used for fetching
            };
            syncStatus = 'success'; 
        } else {
            console.warn(`[unified-sync-v2] No data returned from Ticketmaster for venue TM ID: ${venueTmId}. Keeping existing data.`);
            // Keep status as success, just didn't find new TM data
             syncStatus = 'success'; 
        }
    } else {
       console.warn(`[unified-sync-v2] Venue ${venueId} has no Ticketmaster ID or API Key is missing. Skipping Ticketmaster sync.`);
       // Mark as success since there's nothing to sync externally
       syncStatus = 'success'; 
    }

    // 3. Update the venue record in our database
    const { error: updateError } = await supabase
      .from('venues')
      .update({
        ...updatedVenueData, // Spread the potentially updated fields
        sync_status: syncStatus,
        last_sync: new Date().toISOString(),
        last_sync_error: syncError, // Will be null if successful
        updated_at: new Date().toISOString() // Always update this
      })
      .eq('id', venueId);

    if (updateError) {
      console.error(`[unified-sync-v2] Error updating venue ${venueId}:`, updateError);
      // If update fails, status should be error
      syncStatus = 'error';
      syncError = updateError.message;
      // Log the error but throw it so the main handler catches it
      throw updateError; 
    }
    
    console.log(`[unified-sync-v2] Successfully synced venue ${venueId}. Status: ${syncStatus}`);
    return { success: syncStatus === 'success' };

  } catch (err: any) {
     console.error(`[unified-sync-v2] Overall error syncing venue ${venueId}:`, err);
     syncError = err.message || 'Unknown error';
     // Attempt to mark the venue as error in the DB
     try {
       await supabase
         .from('venues')
         .update({ 
            sync_status: 'error', 
            last_sync_error: syncError,
            last_sync: new Date().toISOString()
          })
         .eq('id', venueId);
     } catch (finalUpdateError: any) {
         console.error(`[unified-sync-v2] Failed to update venue ${venueId} with final error status:`, finalUpdateError);
     }
     
     // Re-throw the original error
     throw err; 
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SyncRequest = await req.json();
    const { entityType, entityId, ticketmasterId, spotifyId, options } = body;

    console.log(`[unified-sync-v2] Received request:`, body);

    let result: any;
    switch (entityType) {
      case 'artist':
        if (!ticketmasterId) {
          throw new Error('Ticketmaster ID is required for artist sync');
        }
        result = await syncArtist(ticketmasterId, spotifyId, options);
        break;
      case 'show':
        if (!entityId) {
          throw new Error('Entity ID (show UUID) is required for show sync');
        }
        result = await syncShow(entityId, options);
        break;
      case 'venue':
         if (!entityId) {
           throw new Error('Entity ID (venue UUID) is required for venue sync');
         }
         result = await syncVenue(entityId, options);
         break;
      default:
        // Using `never` helps TypeScript ensure all cases are handled
        // const _exhaustiveCheck: never = entityType;
        // console.error(`Invalid entity type: ${_exhaustiveCheck}`); 
        console.error(`Invalid entity type received: ${entityType}`); 
        throw new Error(`Invalid entity type: ${entityType}`);
    }

    console.log(`[unified-sync-v2] Sync successful for ${entityType}:`, result);
    return new Response(JSON.stringify(result || { success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error in unified-sync-v2:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
