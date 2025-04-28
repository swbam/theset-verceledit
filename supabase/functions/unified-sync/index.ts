import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { saveArtistToDatabase, saveVenueToDatabase, saveShowToDatabase } from '../_shared/databaseUtils.ts';
import { saveSongToDatabase } from '../_shared/songDbUtils.ts';
import { fetchArtistEvents, fetchTrendingShows } from '../_shared/ticketmasterUtils.ts';
import { getArtistByName, getArtistAllTracks } from '../_shared/spotifyUtils.ts';
import { fetchArtistSetlists, processSetlistData } from '../_shared/setlistFmUtils.ts';
import { saveSetlistSongs } from '../_shared/setlistSongUtils.ts';
import { createClient } from '@supabase/supabase-js';

interface SyncRequest {
  entityType: 'artist' | 'venue' | 'show' | 'song' | 'trending';
  entityId?: string;
  entityName?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: {
    forceRefresh?: boolean;
    skipDependencies?: boolean;
    includeSetlists?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SyncRequest = await req.json();
    console.log('[unified-sync] Received sync request:', input);

    let result;

    if (!input || Object.keys(input).length === 0 || input.entityType === 'trending') {
      console.log('[unified-sync] Fetching trending shows');
      result = await syncTrendingShows();

      if (result?.success && result?.stats.saved > 0) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: shows } = await supabaseClient
          .from('shows')
          .select('artist_id')
          .order('created_at', { ascending: false })
          .limit(result.stats.saved);

        if (shows) {
          const uniqueArtistIds = [...new Set(shows.map(show => show.artist_id))];
          console.log(`[unified-sync] Found ${uniqueArtistIds.length} unique artists to sync`);

          await Promise.all(uniqueArtistIds.map(async (artistId) => {
            if (!artistId) return;
            
            try {
              const { data: artist } = await supabaseClient
                .from('artists')
                .select('name, spotify_id')
                .eq('id', artistId)
                .single();

              if (artist?.spotify_id) {
                console.log(`[unified-sync] Syncing songs for artist ${artist.name}`);
                await syncSong({
                  entityType: 'song',
                  entityId: artistId,
                  spotifyId: artist.spotify_id,
                  options: { skipDependencies: true }
                });
              }
            } catch (error) {
              console.error(`[unified-sync] Error syncing songs for artist ${artistId}:`, error);
            }
          }));
        }
      }

      return new Response(JSON.stringify(result || { success: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!input.entityType) {
      throw new Error('Entity type is required');
    }

    if (!input.entityId && !input.entityName && !input.ticketmasterId && !input.spotifyId) {
      throw new Error('At least one identifier (entityId, entityName, ticketmasterId, spotifyId) is required');
    }

    switch (input.entityType) {
      case 'artist':
        result = await syncArtist(input);
        break;
      case 'venue':
        result = await syncVenue(input);
        break;
      case 'show':
        result = await syncShow(input);
        break;
      case 'song':
        result = await syncSong(input);
        break;
      default:
        throw new Error(`Unsupported entity type: ${input.entityType}`);
    }

    return new Response(JSON.stringify(result || { success: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[unified-sync] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function syncArtist(input: SyncRequest) {
  console.log('[unified-sync] Syncing artist:', JSON.stringify(input, null, 2));

  const supabaseClientInternal = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let resolvedArtistData: Partial<Artist> | null = null;

  // --- Step 1: Resolve Artist Information --- 
  // Prioritize fetching by DB UUID (entityId) if available
  if (input.entityId) {
    console.log(`[unified-sync/syncArtist] Attempting to fetch artist by DB UUID: ${input.entityId}`);
    const { data: artistByDbId, error: fetchByIdError } = await supabaseClientInternal
      .from('artists')
      .select('*')
      .eq('id', input.entityId)
      .maybeSingle();
    
    if (fetchByIdError) {
      console.error(`[unified-sync/syncArtist] Error fetching artist by DB ID ${input.entityId}:`, fetchByIdError);
      // Potentially throw, or try other methods
    }
    if (artistByDbId) {
      console.log(`[unified-sync/syncArtist] Found artist by DB ID: ${artistByDbId.name}`);
      resolvedArtistData = artistByDbId;
    } else {
       console.warn(`[unified-sync/syncArtist] Artist with DB ID ${input.entityId} not found.`);
       // Fallback: Maybe the entityId *was* a TM ID? (Less ideal)
       if (!input.ticketmasterId) input.ticketmasterId = input.entityId;
    }
  }

  // If not resolved by DB ID, try external IDs
  if (!resolvedArtistData && (input.ticketmasterId || input.spotifyId)) {
    console.log(`[unified-sync/syncArtist] Attempting to fetch artist by external IDs (TM: ${input.ticketmasterId}, Spotify: ${input.spotifyId})`);
    const orConditions: string[] = [];
    if (input.ticketmasterId) orConditions.push(`ticketmaster_id.eq.${input.ticketmasterId}`);
    if (input.spotifyId) orConditions.push(`spotify_id.eq.${input.spotifyId}`);
    
    if (orConditions.length > 0) {
      const { data: artistByExternalId, error: fetchByExternalIdError } = await supabaseClientInternal
        .from('artists')
        .select('*')
        .or(orConditions.join(','))
        .maybeSingle();
      
      if (fetchByExternalIdError) {
        console.error(`[unified-sync/syncArtist] Error fetching artist by external IDs:`, fetchByExternalIdError);
      }
      if (artistByExternalId) {
        console.log(`[unified-sync/syncArtist] Found artist by external ID: ${artistByExternalId.name}`);
        resolvedArtistData = artistByExternalId;
      }
    }
  }
  
  // If still not resolved, try by name (Spotify lookup)
  if (!resolvedArtistData && input.entityName) {
    console.log(`[unified-sync/syncArtist] Attempting to resolve artist by name via Spotify: ${input.entityName}`);
    const spotifyArtist = await getArtistByName(input.entityName);
    if (spotifyArtist?.id) {
      input.spotifyId = spotifyArtist.id; // Update input for saving
      console.log(`[unified-sync/syncArtist] Found Spotify ID: ${input.spotifyId}. Checking DB again.`);
      // Check DB again with the newly found Spotify ID
      const { data: artistBySpotifyId, error: fetchBySpotifyIdError } = await supabaseClientInternal
        .from('artists')
        .select('*')
        .eq('spotify_id', input.spotifyId)
        .maybeSingle();
      if (fetchBySpotifyIdError) {
        console.error(`[unified-sync/syncArtist] Error fetching artist by newly found Spotify ID:`, fetchBySpotifyIdError);
      }
      if (artistBySpotifyId) {
         console.log(`[unified-sync/syncArtist] Found existing artist via Spotify ID: ${artistBySpotifyId.name}`);
         resolvedArtistData = artistBySpotifyId;
      }
    }
  }
  
  // --- Step 2: Prepare data for saving --- 
  // Combine input data with any resolved DB data
  const artistDataToSave: Partial<Artist> = {
    ...(resolvedArtistData || {}), // Base on resolved data if found
    // Explicitly use input values if provided, otherwise keep resolved/existing
    name: input.entityName || resolvedArtistData?.name, 
    ticketmaster_id: input.ticketmasterId || resolvedArtistData?.ticketmaster_id,
    spotify_id: input.spotifyId || resolvedArtistData?.spotify_id,
    // Keep other fields from input if needed, or rely on resolved data
  };
  
  // Basic validation before saving
  if (!artistDataToSave.name || (!artistDataToSave.ticketmaster_id && !artistDataToSave.spotify_id)) {
     console.error("[unified-sync/syncArtist] Cannot save artist - missing name or external ID after resolution.", artistDataToSave);
     throw new Error('Failed to resolve necessary artist identifiers (name and external ID).');
  }

  // --- Step 3: Save artist to DB --- 
  console.log('[unified-sync/syncArtist] Calling saveArtistToDatabase with:', JSON.stringify(artistDataToSave, null, 2));
  const savedArtist = await saveArtistToDatabase(artistDataToSave); // saveArtistToDatabase handles upsert logic
  if (!savedArtist?.id) {
    console.error("[unified-sync/syncArtist] Failed to save artist to database or get DB ID.", savedArtist);
    throw new Error('Failed to save artist to database');
  }
  console.log(`[unified-sync/syncArtist] DB Artist ID confirmed/saved: ${savedArtist.id}, Name: ${savedArtist.name}`);

  // --- Step 4: Sync Dependencies (Tracks, Setlists, Shows) --- 
  const artistDbId = savedArtist.id; // Use the confirmed DB ID
  const artistSpotifyId = savedArtist.spotify_id;
  const artistTmId = savedArtist.ticketmaster_id;
  const artistFmId = savedArtist.setlist_fm_id; // Assuming saveArtistToDatabase preserves/returns this
  const artistName = savedArtist.name;

  // Sync Spotify Tracks (if Spotify ID exists)
  if (artistSpotifyId && !input.options?.skipDependencies) {
    console.log(`[unified-sync/syncArtist] Fetching tracks for artist: ${artistName} (Spotify ID: ${artistSpotifyId})`);
    try {
      // Fetch tracks from Spotify
      const tracksResult = await getArtistAllTracks(artistSpotifyId);
      console.log(`[unified-sync/syncArtist] Found ${tracksResult.tracks.length} tracks from Spotify.`);
      
      // Save tracks to the database
      const savePromises = tracksResult.tracks.map(track => 
        supabaseClientInternal
          .from('songs')
          .upsert({
            spotify_id: track.id,
            name: track.name,
            artist_id: artistDbId, // Link using DB Artist ID
            spotify_url: track.external_urls?.spotify,
            preview_url: track.preview_url,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            album_name: track.album?.name,
            album_image: track.album?.images?.[0]?.url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'spotify_id' 
          })
      );
      await Promise.all(savePromises);
      console.log(`[unified-sync/syncArtist] Saved/Updated ${tracksResult.tracks.length} tracks to database.`);
    } catch (error) {
      console.error('[unified-sync/syncArtist] Error syncing Spotify tracks:', error);
    }
  }

  // Sync Setlist.fm Setlists (if option enabled and name/ID exists)
  if (!input.options?.skipDependencies && input.options?.includeSetlists) {
    console.log(`[unified-sync/syncArtist] Fetching past setlists for artist: ${artistName} (SetlistFM ID: ${artistFmId || 'N/A'})`);
    try {
      const setlistsResponse = await fetchArtistSetlists(artistName, artistFmId); // Pass resolved FM ID if available
      if (setlistsResponse.setlist && setlistsResponse.setlist.length > 0) {
        console.log(`[unified-sync/syncArtist] Found ${setlistsResponse.setlist.length} past setlists, processing up to 5 in background...`);
        // Process a few recent setlists asynchronously
        queueMicrotask(async () => {
          try {
            for (const setlist of setlistsResponse.setlist.slice(0, 5)) { // Process only the first 5
              const processedData = processSetlistData(setlist);
              
              // Create or find the associated show
              const showData = {
                name: `${artistName} at ${processedData.venue.name}`, // Simple name generation
                date: processedData.eventDate || new Date().toISOString(),
                artist_id: artistDbId, // Use DB Artist ID
                // Provide venue details for saveShowToDatabase to handle
                venue: {
                  name: processedData.venue.name,
                  city: processedData.venue.city,
                  country: processedData.venue.country
                }
              };
              
              // Save show (will create/update venue inside)
              const savedShow = await saveShowToDatabase(showData);
              if (savedShow?.id) {
                 console.log(`[unified-sync/syncArtist Background] Saved/Found show ${savedShow.id} for setlist ${processedData.setlist_id}`);
                 // Create/Update the setlist record itself
                 const { data: savedSetlist, error: setlistSaveError } = await supabaseClientInternal
                  .from('setlists')
                  .upsert({
                    setlist_fm_id: processedData.setlist_id,
                    artist_id: artistDbId, // Use DB Artist ID
                    show_id: savedShow.id, // Use DB Show ID
                    date: processedData.eventDate || undefined,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'setlist_fm_id'
                  })
                  .select('id') // Select only the ID
                  .single();
                
                if (setlistSaveError) {
                   console.error(`[unified-sync/syncArtist Background] Error saving setlist record ${processedData.setlist_id}:`, setlistSaveError);
                } else if (savedSetlist?.id) {
                  // Save the songs linked to this setlist
                   console.log(`[unified-sync/syncArtist Background] Saving songs for setlist ${savedSetlist.id}`);
                  await saveSetlistSongs(savedSetlist.id, artistDbId, processedData.songs);
                }
              } else {
                 console.warn(`[unified-sync/syncArtist Background] Failed to save show for setlist ${processedData.setlist_id}`);
              }
            }
            console.log(`[unified-sync/syncArtist Background] Finished processing setlists.`);
          } catch (backgroundError) {
            console.error('[unified-sync/syncArtist Background] Setlist processing error:', backgroundError);
          }
        });
      } else {
         console.log(`[unified-sync/syncArtist] No past setlists found on Setlist.fm for ${artistName}`);
      }
    } catch (error) {
      console.error('[unified-sync/syncArtist] Error fetching/processing Setlist.fm data:', error);
    }
  }

  // Sync Ticketmaster Shows (if Ticketmaster ID exists)
  if (artistTmId && !input.options?.skipDependencies) {
    console.log(`[unified-sync/syncArtist] Fetching Ticketmaster shows for artist: ${artistName} (TM ID: ${artistTmId})`);
    try {
      const shows = await fetchArtistEvents(artistTmId); // Use the resolved TM ID
      console.log(`[unified-sync/syncArtist] Found ${shows.length} shows from Ticketmaster.`);

      let savedShowCount = 0;
      let errorShowCount = 0;

      // Process shows sequentially to avoid overwhelming DB/utils
      for (const show of shows) {
        try {
          // Ensure the artist ID is the DB ID before saving the show
          const showToSave = { 
              ...show, 
              artist: { 
                  id: artistDbId, // ** Crucial: Use DB Artist ID **
                  name: artistName,
                  ticketmaster_id: artistTmId 
              },
              artist_id: artistDbId // Also ensure top-level artist_id is correct
          };
          
          const savedShow = await saveShowToDatabase(showToSave);
          if (savedShow) {
            savedShowCount++;
          } else {
            errorShowCount++;
            console.error(`[unified-sync/syncArtist] Failed to save show (returned null): ${show.name}`);
          }
        } catch (showSaveError) {
          errorShowCount++;
          console.error(`[unified-sync/syncArtist] Error saving show ${show.name}:`, showSaveError);
        }
      }

      console.log(`[unified-sync/syncArtist] Ticketmaster shows sync complete. Saved: ${savedShowCount}, Errors: ${errorShowCount}`);

      // Update artist's last_sync timestamp
      const { error: syncUpdateError } = await supabaseClientInternal
        .from('artists')
        .update({ 
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', artistDbId);

      if (syncUpdateError) {
        console.error('[unified-sync/syncArtist] Error updating artist last_sync timestamp:', syncUpdateError);
      }

    } catch (showsError) {
      console.error('[unified-sync/syncArtist] Error in Ticketmaster shows sync process:', showsError);
    }
  } else if (!artistTmId && !input.options?.skipDependencies){
      console.warn(`[unified-sync/syncArtist] Skipping Ticketmaster show sync for ${artistName} because Ticketmaster ID is missing.`);
  }

  // --- Step 5: Return Result --- 
  return {
    success: true,
    message: `Successfully synced artist ${artistName} (ID: ${artistDbId})`, 
    artist: savedArtist, // Return the final state of the artist from the DB
  };
}

async function syncVenue(input: SyncRequest) {
  console.log('[unified-sync] Syncing venue:', input);

  const venueData = {
    id: input.entityId,
    name: input.entityName,
    ticketmaster_id: input.ticketmasterId,
  };

  const savedVenue = await saveVenueToDatabase(venueData);
  if (!savedVenue) {
    throw new Error('Failed to save venue to database');
  }

  return {
    success: true,
    venue: savedVenue,
  };
}

async function syncShow(input: SyncRequest) {
  console.log('[unified-sync] Syncing show:', input);

  const showData = {
    id: input.entityId,
    name: input.entityName,
    ticketmaster_id: input.ticketmasterId,
  };

  const savedShow = await saveShowToDatabase(showData);
  if (!savedShow) {
    throw new Error('Failed to save show to database');
  }

  return {
    success: true,
    show: savedShow,
  };
}

async function syncSong(input: SyncRequest) {
  console.log('[unified-sync] Syncing song:', input);
  
  if (!input.entityName || !input.spotifyId) {
    throw new Error('Song name and Spotify ID are required');
  }

  const songData = {
    name: input.entityName,
    spotify_id: input.spotifyId,
    artist_id: input.entityId
  };

  const savedSong = await saveSongToDatabase(songData);
  if (!savedSong) {
    throw new Error('Failed to save song to database');
  }

  return {
    success: true,
    song: savedSong
  };
}

async function syncTrendingShows() {
  console.log('[unified-sync] Fetching trending shows');
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const shows = await fetchTrendingShows();
    console.log(`[unified-sync] Found ${shows.length} trending shows to sync`);
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const show of shows) {
      try {
        // Skip if no ticketmaster ID
        if (!show.ticketmaster_id) {
          console.warn('[unified-sync] Show missing ticketmaster_id, skipping:', show.name);
          continue;
        }

        // Check if show already exists
        const { data: existingShow } = await supabaseClient
          .from('shows')
          .select('id, ticketmaster_id')
          .eq('ticketmaster_id', show.ticketmaster_id)
          .single();

        if (existingShow) {
          // Update existing show's popularity
          await supabaseClient
            .from('shows')
            .update({
              popularity: show.popularity || 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingShow.id);
            
          console.log(`[unified-sync] Updated existing show: ${show.name}`);
          savedCount++;
          continue;
        }

        // Process artist
        let artistId = null;
        if (show.artist) {
          const { data: savedArtist } = await supabaseClient
            .from('artists')
            .select('id')
            .eq('ticketmaster_id', show.artist.ticketmaster_id)
            .single();

          if (savedArtist) {
            artistId = savedArtist.id;
          } else {
            const { data: newArtist } = await supabaseClient
              .from('artists')
              .insert({
                name: show.artist.name,
                ticketmaster_id: show.artist.ticketmaster_id,
                image_url: show.artist.image_url,
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (newArtist) {
              artistId = newArtist.id;
              
              // Trigger artist sync
              await supabaseClient.functions.invoke('sync-artist', {
                body: { 
                  artistId: newArtist.id,
                  ticketmasterId: show.artist.ticketmaster_id
                }
              });
            }
          }
        }

        // Process venue
        let venueId = null;
        if (show.venue) {
          const { data: savedVenue } = await supabaseClient
            .from('venues')
            .select('id')
            .eq('ticketmaster_id', show.venue.ticketmaster_id)
            .single();

          if (savedVenue) {
            venueId = savedVenue.id;
          } else {
            const { data: newVenue } = await supabaseClient
              .from('venues')
              .insert({
                name: show.venue.name,
                city: show.venue.city,
                state: show.venue.state,
                country: show.venue.country,
                ticketmaster_id: show.venue.ticketmaster_id,
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (newVenue) {
              venueId = newVenue.id;
            }
          }
        }

        // Save show
        const { data: savedShow } = await supabaseClient
          .from('shows')
          .insert({
            name: show.name,
            date: show.date,
            image_url: show.image_url,
            ticket_url: show.ticket_url,
            artist_id: artistId,
            venue_id: venueId,
            ticketmaster_id: show.ticketmaster_id,
            popularity: show.popularity || 0,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (savedShow) {
          if (artistId) {
            const { data: artistSongs } = await supabaseClient
              .from('songs')
              .select('id, name')
              .eq('artist_id', artistId);

            if (artistSongs && artistSongs.length > 0) {
              const { data: savedSetlist, error: setlistError } = await supabaseClient
                .from('setlists')
                .insert({
                  show_id: savedShow.id,
                  artist_id: artistId,
                  date: show.date,
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (!setlistError && savedSetlist) {
                const selectedSongs = [...artistSongs]
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 5);

                await supabaseClient
                  .from('setlist_songs')
                  .insert(
                    selectedSongs.map((song, index) => ({
                      setlist_id: savedSetlist.id,
                      song_id: song.id,
                      name: song.name,
                      position: index + 1,
                      artist_id: artistId,
                      votes: 0,
                      vote_count: 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }))
                  );
              }
            }
          }
          savedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('[unified-sync] Error processing trending show:', error);
        errorCount++;
      }
    }

    return {
      success: true,
      stats: {
        total: shows.length,
        saved: savedCount,
        errors: errorCount
      }
    };

  } catch (error) {
    console.error('[unified-sync] Error syncing trending shows:', error);
    throw error;
  }
}
