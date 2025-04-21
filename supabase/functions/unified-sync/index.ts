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
    includeSetlists?: boolean; // Optional: include historical setlists from setlist.fm
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
  // Parse request body
  const input: SyncRequest = await req.json();
  console.log('[unified-sync] Received sync request:', input);

  // If no input is provided or explicitly requesting trending shows
  if (!input || Object.keys(input).length === 0 || input.entityType === 'trending') {
    console.log('[unified-sync] Fetching trending shows');
    const result = await syncTrendingShows();

    // For each show's artist, trigger a background sync to get their songs
    if (result.success && result.stats.saved > 0) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Get unique artist IDs from recently synced shows
      const { data: shows } = await supabaseClient
        .from('shows')
        .select('artist_id')
        .order('created_at', { ascending: false })
        .limit(result.stats.saved);

      if (shows) {
        const uniqueArtistIds = [...new Set(shows.map(show => show.artist_id))];
        console.log(`[unified-sync] Found ${uniqueArtistIds.length} unique artists to sync`);

        // Sync each artist's songs in parallel
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  // Validate input for specific entity sync
  if (!input.entityType) {
    throw new Error('Entity type is required');
  }

  if (!input.entityId && !input.entityName && !input.ticketmasterId && !input.spotifyId) {
    throw new Error('At least one identifier (ID, name, or external ID) is required');
  }

  let result;
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

    return new Response(JSON.stringify(result), {
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
  console.log('[unified-sync] Syncing artist:', input);

  // 1. If we have a name but no IDs, search Spotify first
  if (input.entityName && !input.spotifyId) {
    console.log(`[unified-sync] Searching Spotify for artist: ${input.entityName}`);
    const spotifyArtist = await getArtistByName(input.entityName);
    if (spotifyArtist) {
      input.spotifyId = spotifyArtist.id;
      console.log(`[unified-sync] Found Spotify ID: ${input.spotifyId}`);
    }
  }

  // 2. Save artist to database
  const artistData = {
    id: input.entityId,
    name: input.entityName,
    ticketmaster_id: input.ticketmasterId,
    spotify_id: input.spotifyId,
  };

  const savedArtist = await saveArtistToDatabase(artistData);
  if (!savedArtist) {
    throw new Error('Failed to save artist to database');
  }

  // 3. If we have Spotify ID, fetch and save tracks
  if (savedArtist.spotify_id && (!input.options?.skipDependencies)) {
    console.log(`[unified-sync] Fetching tracks for artist: ${savedArtist.name}`);
    try {
      const tracks = await getArtistAllTracks(savedArtist.spotify_id);
      console.log(`[unified-sync] Found ${tracks.tracks.length} tracks`);
      
      // Store tracks in database
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      for (const track of tracks.tracks) {
        await supabaseClient
          .from('songs')
          .upsert({
            spotify_id: track.id,
            name: track.name,
            artist_id: savedArtist.id,
            spotify_url: track.external_urls?.spotify,
            preview_url: track.preview_url,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            album_name: track.album?.name,
            album_image: track.album?.images?.[0]?.url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'spotify_id'
          });
      }
      console.log(`[unified-sync] Saved ${tracks.tracks.length} tracks to database`);
    } catch (error) {
      console.error('[unified-sync] Error syncing tracks:', error);
    }
  }

  // 4. Optionally fetch past setlists from setlist.fm (low priority)
  if (!input.options?.skipDependencies && input.options?.includeSetlists) {
    console.log(`[unified-sync] Fetching past setlists for artist: ${savedArtist.name} (optional)`);
    try {
      const setlists = await fetchArtistSetlists(savedArtist.name, savedArtist.setlist_fm_id);
      if (setlists.setlist && setlists.setlist.length > 0) {
        console.log(`[unified-sync] Found ${setlists.setlist.length} past setlists, processing in background`);
        // Process setlists in background
        queueMicrotask(async () => {
          try {
            const supabaseClient = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            
            for (const setlist of setlists.setlist.slice(0, 5)) {
              const processedData = processSetlistData(setlist);
              const showData = {
                name: `${savedArtist.name} at ${processedData.venue.name}`,
                date: processedData.eventDate || new Date().toISOString(),
                artist_id: savedArtist.id,
                venue: {
                  name: processedData.venue.name,
                  city: processedData.venue.city,
                  country: processedData.venue.country
                }
              };
              
              const savedShow = await saveShowToDatabase(showData);
              if (savedShow) {
                const { data: savedSetlist, error: setlistError } = await supabaseClient
                  .from('setlists')
                  .upsert({
                    setlist_fm_id: processedData.setlist_id,
                    artist_id: savedArtist.id,
                    show_id: savedShow.id,
                    date: processedData.eventDate || undefined,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'setlist_fm_id'
                  })
                  .select()
                  .single();
                
                if (!setlistError && savedSetlist) {
                  await saveSetlistSongs(savedSetlist.id, savedArtist.id, processedData.songs);
                }
              }
            }
            console.log(`[unified-sync] Finished processing setlists in background`);
          } catch (error) {
            console.error('[unified-sync] Background setlist processing error:', error);
          }
        });
      }
    } catch (error) {
      console.error('[unified-sync] Error fetching setlists:', error);
    }
  }

  // 5. If we have Ticketmaster ID, fetch and save shows
  if (input.ticketmasterId && (!input.options?.skipDependencies)) {
    console.log(`[unified-sync] Fetching shows for artist: ${savedArtist.name}`);
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Update artist's Ticketmaster ID if it's not set
      if (!savedArtist.ticketmaster_id) {
        const { error: updateError } = await supabaseClient
          .from('artists')
          .update({ 
            ticketmaster_id: input.ticketmasterId,
            updated_at: new Date().toISOString()
          })
          .eq('id', savedArtist.id);

        if (updateError) {
          console.error('[unified-sync] Error updating artist Ticketmaster ID:', updateError);
          throw new Error(`Failed to update artist Ticketmaster ID: ${updateError.message}`);
        }
        
        console.log(`[unified-sync] Updated artist Ticketmaster ID to: ${input.ticketmasterId}`);
        savedArtist.ticketmaster_id = input.ticketmasterId;
      }

      // Fetch and save shows
      const shows = await fetchArtistEvents(input.ticketmasterId);
      console.log(`[unified-sync] Found ${shows.length} shows`);

      // Track successful saves
      let savedCount = 0;
      let errorCount = 0;

      // Save each show with the correct artist UUID and create initial setlist
      for (const show of shows) {
        try {
          const savedShow = await saveShowToDatabase({
            ...show,
            artist: {
              id: savedArtist.id,
              name: savedArtist.name,
              ticketmaster_id: savedArtist.ticketmaster_id
            }
          });

          if (savedShow) {
            // Check if setlist already exists
            const { data: existingSetlist, error: checkError } = await supabaseClient
              .from('setlists')
              .select('id')
              .eq('show_id', savedShow.id)
              .maybeSingle();

            if (checkError) {
              console.error(`[unified-sync] Error checking existing setlist:`, checkError);
              continue;
            }

            // Only create setlist if it doesn't exist
            if (!existingSetlist) {
              try {
                // Get all songs
                const { data: artistSongs, error: songsError } = await supabaseClient
                  .from('songs')
                  .select('id, name')
                  .eq('artist_id', savedArtist.id);

                if (songsError) {
                  console.error(`[unified-sync] Error fetching songs:`, songsError);
                  continue;
                }

                if (!artistSongs || artistSongs.length === 0) {
                  console.error(`[unified-sync] No songs found for artist ${savedArtist.name}`);
                  continue;
                }

                // Create setlist
                const { data: savedSetlist, error: setlistError } = await supabaseClient
                  .from('setlists')
                  .insert({
                    show_id: savedShow.id,
                    artist_id: savedArtist.id,
                    date: show.date,
                    updated_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                if (setlistError) {
                  console.error(`[unified-sync] Error creating setlist:`, setlistError);
                  continue;
                }

                if (!savedSetlist) {
                  console.error(`[unified-sync] Failed to create setlist for show ${savedShow.id}`);
                  continue;
                }

                // Randomly select 5 songs from the entire catalog
                const selectedSongs = [...artistSongs]
                  .sort(() => Math.random() - 0.5) // Shuffle array
                  .slice(0, 5); // Take first 5

                // Add songs to setlist
                const { error: songsInsertError } = await supabaseClient
                  .from('setlist_songs')
                  .insert(
                    selectedSongs.map((song, index) => ({
                      setlist_id: savedSetlist.id,
                      song_id: song.id,
                      name: song.name,
                      position: index + 1,
                      artist_id: savedArtist.id,
                      votes: 0,
                      vote_count: 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }))
                  );

                if (songsInsertError) {
                  console.error(`[unified-sync] Error adding songs to setlist ${savedSetlist.id}:`, songsInsertError);
                  // Delete the setlist if we couldn't add songs
                  await supabaseClient
                    .from('setlists')
                    .delete()
                    .eq('id', savedSetlist.id);
                  continue;
                }

                console.log(`[unified-sync] Successfully created setlist with ${selectedSongs.length} songs for show ${savedShow.id}`);
              } catch (setlistError) {
                console.error(`[unified-sync] Error creating setlist for show ${savedShow.id}:`, setlistError);
                continue;
              }
            }
            savedCount++;
          } else {
            errorCount++;
            console.error(`[unified-sync] Failed to save show: ${show.name}`);
          }
        } catch (showError) {
          errorCount++;
          console.error(`[unified-sync] Error saving show ${show.name}:`, showError);
          // Continue with next show
        }
      }

      console.log(`[unified-sync] Shows sync complete. Saved: ${savedCount}, Errors: ${errorCount}`);

      // Update artist's last sync timestamp
      const { error: syncUpdateError } = await supabaseClient
        .from('artists')
        .update({ 
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', savedArtist.id);

      if (syncUpdateError) {
        console.error('[unified-sync] Error updating artist sync timestamp:', syncUpdateError);
      }

    } catch (showsError) {
      console.error('[unified-sync] Error in shows sync process:', showsError);
      // Continue with the rest of the sync process
    }
  }

  return {
    success: true,
    artist: savedArtist,
  };
}

async function syncVenue(input: SyncRequest) {
  console.log('[unified-sync] Syncing venue:', input);

  // Save venue to database
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

  // Save show to database
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
  
  // Validate required fields
  if (!input.entityName || !input.spotifyId) {
    throw new Error('Song name and Spotify ID are required');
  }

  // Save song to database
  const songData = {
    name: input.entityName,
    spotify_id: input.spotifyId,
    artist_id: input.entityId // This should be the artist's DB UUID
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
    // Fetch trending shows from Ticketmaster
    const shows = await fetchTrendingShows();
    console.log(`[unified-sync] Found ${shows.length} trending shows`);

    let savedCount = 0;
    let errorCount = 0;

    // Process each show
    for (const show of shows) {
      try {
      // Save artist if it exists
      let artistId = null;
      if (show.artist) {
        console.log(`[unified-sync] Processing artist for show: ${show.name}`, show.artist);
        
        // First check if artist already exists by ticketmaster_id
        const { data: existingArtist } = await supabaseClient
          .from('artists')
          .select('id')
          .eq('ticketmaster_id', show.artist.ticketmaster_id)
          .maybeSingle();

        if (existingArtist) {
          artistId = existingArtist.id;
          console.log(`[unified-sync] Found existing artist with ID ${artistId}`);
        } else {
          console.log(`[unified-sync] Creating new artist: ${show.artist.name}`);
          const savedArtist = await saveArtistToDatabase({
            name: show.artist.name,
            ticketmaster_id: show.artist.ticketmaster_id,
            image_url: show.artist.image_url || undefined,
            spotify_id: show.artist.spotify_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (savedArtist) {
            artistId = savedArtist.id;
            console.log(`[unified-sync] Created new artist with ID ${artistId}`);
            
            // Trigger a background sync to get artist's songs
            try {
              await supabaseClient.functions.invoke('sync-artist', {
                body: { 
                  artistId: savedArtist.id,
                  ticketmasterId: savedArtist.ticketmaster_id
                }
              });
            } catch (error) {
              console.error(`[unified-sync] Error triggering artist sync for ${savedArtist.name}:`, error);
            }
          }
        }
      } else {
        console.log(`[unified-sync] No artist data for show: ${show.name}`);
      }

        // Save venue if it exists
        let venueId = null;
        if (show.venue) {
          const savedVenue = await saveVenueToDatabase(show.venue);
          if (savedVenue) {
            venueId = savedVenue.id;
          }
        }

        // Save show with correct references
        const savedShow = await saveShowToDatabase({
          ...show,
          artist_id: artistId,
          venue_id: venueId,
          artist: artistId ? {
            id: artistId,
            ticketmaster_id: show.artist?.ticketmaster_id
          } : undefined
        });

        if (savedShow) {
          // Create initial setlist if artist has songs
          if (artistId) {
            const { data: artistSongs } = await supabaseClient
              .from('songs')
              .select('id, name')
              .eq('artist_id', artistId);

            if (artistSongs && artistSongs.length > 0) {
              // Create setlist
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
                // Randomly select 5 songs
                const selectedSongs = [...artistSongs]
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 5);

                // Add songs to setlist
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
