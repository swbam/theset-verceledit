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
      throw new Error('At least one identifier (ID, name, or external ID) is required');
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
  console.log('[unified-sync] Syncing artist:', input);

  if (input.entityName && !input.spotifyId) {
    console.log(`[unified-sync] Searching Spotify for artist: ${input.entityName}`);
    const spotifyArtist = await getArtistByName(input.entityName);
    if (spotifyArtist) {
      input.spotifyId = spotifyArtist.id;
      console.log(`[unified-sync] Found Spotify ID: ${input.spotifyId}`);
    }
  }

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

  if (savedArtist.spotify_id && (!input.options?.skipDependencies)) {
    console.log(`[unified-sync] Fetching tracks for artist: ${savedArtist.name}`);
    try {
      const tracks = await getArtistAllTracks(savedArtist.spotify_id);
      console.log(`[unified-sync] Found ${tracks.tracks.length} tracks`);
      
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

  if (!input.options?.skipDependencies && input.options?.includeSetlists) {
    console.log(`[unified-sync] Fetching past setlists for artist: ${savedArtist.name} (optional)`);
    try {
      const setlists = await fetchArtistSetlists(savedArtist.name, savedArtist.setlist_fm_id);
      if (setlists.setlist && setlists.setlist.length > 0) {
        console.log(`[unified-sync] Found ${setlists.setlist.length} past setlists, processing in background`);
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

  if (input.ticketmasterId && (!input.options?.skipDependencies)) {
    console.log(`[unified-sync] Fetching shows for artist: ${savedArtist.name}`);
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

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

      const shows = await fetchArtistEvents(input.ticketmasterId);
      console.log(`[unified-sync] Found ${shows.length} shows`);

      let savedCount = 0;
      let errorCount = 0;

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
            const { data: existingSetlist, error: checkError } = await supabaseClient
              .from('setlists')
              .select('id')
              .eq('show_id', savedShow.id)
              .maybeSingle();

            if (checkError) {
              console.error(`[unified-sync] Error checking existing setlist:`, checkError);
              continue;
            }

            if (!existingSetlist) {
              try {
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

                const selectedSongs = [...artistSongs]
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 5);

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
        }
      }

      console.log(`[unified-sync] Shows sync complete. Saved: ${savedCount}, Errors: ${errorCount}`);

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
    }
  }

  return {
    success: true,
    artist: savedArtist,
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
    console.log(`[unified-sync] Found ${shows.length} trending shows`);

    let savedCount = 0;
    let errorCount = 0;

    for (const show of shows) {
      try {
        let artistId = null;
        if (show.artist) {
          console.log(`[unified-sync] Processing artist for show: ${show.name}`, show.artist);
          
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
          const showNameParts = show.name.split(' - ');
          if (showNameParts.length > 1) {
            const artistName = showNameParts[0].trim();
            console.log(`[unified-sync] Attempting to create artist from show name: ${artistName}`);
            
            const { data: existingArtist } = await supabaseClient
              .from('artists')
              .select('id')
              .ilike('name', artistName)
              .maybeSingle();

            if (existingArtist) {
              artistId = existingArtist.id;
              console.log(`[unified-sync] Found existing artist by name with ID ${artistId}`);
            } else {
              const savedArtist = await saveArtistToDatabase({
                name: artistName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

              if (savedArtist) {
                artistId = savedArtist.id;
                console.log(`[unified-sync] Created new artist from show name with ID ${artistId}`);
              }
            }
          }
        }

        let venueId = null;
        if (show.venue) {
          const savedVenue = await saveVenueToDatabase(show.venue);
          if (savedVenue) {
            venueId = savedVenue.id;
          }
        }

        const savedShow = await saveShowToDatabase({
          ...show,
          artist_id: artistId,
          venue_id: venueId,
          // Define artist object separately for clarity
          artist: artistId 
            ? { 
                id: artistId, 
                ticketmaster_id: show.artist?.ticketmaster_id ?? undefined 
              } 
            : undefined
        });

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
