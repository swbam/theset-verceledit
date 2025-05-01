import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchArtistEvents, fetchTrendingShows, searchTicketmasterArtistByName } from '../_shared/ticketmasterUtils.ts';
import { getArtistByName, getArtistAllTracks } from '../_shared/spotifyUtils.ts';
import { fetchArtistSetlists, processSetlistData } from '../_shared/setlistFmUtils.ts';
import { saveSetlistSongs } from '../_shared/setlistSongUtils.ts';
import { createClient } from '@supabase/supabase-js';
import { retry } from '../_shared/retryUtils.ts';

// --- DEBUG LOGS FOR ENVIRONMENT ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
console.log('[unified-sync][DEBUG] SUPABASE_URL present:', !!supabaseUrl);
console.log('[unified-sync][DEBUG] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);
// -----------------------------------

type Database = any; // Replace with your actual database type if available

const RETRY_OPTIONS = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
};

const supabaseClientInternal = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface Artist {
  id: string;
  name: string;
  ticketmaster_id?: string;
  spotify_id?: string;
  setlist_fm_id?: string;
  image_url?: string;
  genres?: string[];
  last_sync?: string;
  updated_at: string;
}

interface Venue {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  ticketmaster_id?: string;
}

interface Show {
  id: string;
  name: string;
  date: string;
  image_url?: string;
  ticket_url?: string;
  artist_id?: string;
  venue_id?: string;
  ticketmaster_id: string;
  popularity: number;
  updated_at: string;
}

interface Song {
  id: string;
  name: string;
  spotify_id: string;
  artist_id?: string;
  updated_at: string;
}

interface SyncOptions {
  forceRefresh?: boolean;
  skipDependencies?: boolean;
  includeSetlists?: boolean;
}

interface SyncRequest {
  entityType: 'artist' | 'venue' | 'show' | 'song' | 'trending';
  entityId?: string;
  entityName?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  imageUrl?: string;
  genres?: string[];
  artistId?: string;
  date?: string;
  ticketUrl?: string;
  venue?: Partial<Venue>;
  options?: SyncOptions;
}

interface SyncResult {
  success: boolean;
  stats?: {
    saved: number;
    errors: number;
  };
  artist?: Artist;
  venue?: Venue;
  show?: Show;
  song?: Song;
  error?: string;
  message?: string;
  details?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

interface SpotifyArtist {
  id: string;
  name: string;
  images?: { url: string }[];
  genres?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SyncRequest = await req.json();
    console.log('[unified-sync] Received sync request:', JSON.stringify(input, null, 2));

    let result: SyncResult;

    if (!input || Object.keys(input).length === 0 || input.entityType === 'trending') {
      console.log('[unified-sync] Fetching trending shows');
      result = await retry(() => syncTrendingShows(), {
        ...RETRY_OPTIONS,
        onRetry: (error: Error, attempt: number) => {
          console.log(`[unified-sync] Retry attempt ${attempt} for syncTrendingShows due to error:`, error);
        }
      });

      if (result.success && result.stats?.saved && result.stats.saved > 0) {
        console.log(`[unified-sync] Syncing artists for ${result.stats.saved} trending shows`);
        await retry(() => syncArtistsForTrendingShows(result.stats!.saved), {
          ...RETRY_OPTIONS,
          onRetry: (error: Error, attempt: number) => {
            console.log(`[unified-sync] Retry attempt ${attempt} for syncArtistsForTrendingShows due to error:`, error);
          }
        });
      }
    } else {
      if (!input.entityType) {
        throw new Error('Entity type is required');
      }

      if (!input.entityId && !input.entityName && !input.ticketmasterId && !input.spotifyId) {
        throw new Error('At least one identifier (entityId, entityName, ticketmasterId, spotifyId) is required');
      }

      console.log(`[unified-sync] Syncing entity of type: ${input.entityType}`);
      result = await retry(() => syncEntity(input), {
        ...RETRY_OPTIONS,
        onRetry: (error: Error, attempt: number) => {
          console.log(`[unified-sync] Retry attempt ${attempt} for syncEntity due to error:`, error);
        }
      });
    }

    console.log('[unified-sync] Sync completed successfully');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error('[unified-sync] Error:', error);
    let errorMessage = 'An unknown error occurred';
    let errorDetails: Record<string, unknown> = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    console.error(`[unified-sync] Error details:`, JSON.stringify(errorDetails, null, 2));
    
    // Log additional context
    console.error('[unified-sync] Environment:', {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      TICKETMASTER_API_KEY: !!Deno.env.get('TICKETMASTER_API_KEY'),
      SPOTIFY_CLIENT_ID: !!Deno.env.get('SPOTIFY_CLIENT_ID'),
      SPOTIFY_CLIENT_SECRET: !!Deno.env.get('SPOTIFY_CLIENT_SECRET'),
    });
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorDetails,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function syncEntity(input: SyncRequest): Promise<SyncResult> {
  console.log(`[unified-sync] Syncing entity of type: ${input.entityType}`);
  try {
    let result: SyncResult;
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
    console.log(`[unified-sync] Successfully synced ${input.entityType}`);
    return result;
  } catch (error) {
    console.error(`[unified-sync] Error syncing ${input.entityType}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during sync',
      details: error instanceof Error ? { name: error.name, stack: error.stack } : {}
    };
  }
}

async function syncArtistsForTrendingShows(savedShowsCount: number): Promise<void> {
  console.log(`[unified-sync] Starting to sync artists for ${savedShowsCount} trending shows`);

  try {
    const { data: shows, error } = await supabaseClientInternal
      .from('shows')
      .select('artist_id')
      .order('created_at', { ascending: false })
      .limit(savedShowsCount);

    if (error) throw error;

    if (shows && shows.length > 0) {
      const uniqueArtistIds = [...new Set(shows.map(show => show.artist_id))];
      console.log(`[unified-sync] Found ${uniqueArtistIds.length} unique artists to sync`);

      await Promise.all(uniqueArtistIds.map(async (artistId) => {
        if (!artistId) return;
        
        await retry(async () => {
          const { data: artist, error: artistError } = await supabaseClientInternal
            .from('artists')
            .select('name, spotify_id')
            .eq('id', artistId)
            .single();

          if (artistError) throw artistError;

          if (artist?.spotify_id) {
            console.log(`[unified-sync] Syncing songs for artist ${artist.name}`);
            await syncSong({
              entityType: 'song',
              entityId: artistId,
              spotifyId: artist.spotify_id,
              options: { skipDependencies: true }
            });
          } else {
            console.log(`[unified-sync] Skipping song sync for artist ${artist?.name || artistId} (no Spotify ID)`);
          }
        }, RETRY_OPTIONS);
      }));

      console.log('[unified-sync] Completed syncing artists for trending shows');
    } else {
      console.log('[unified-sync] No shows found to sync artists');
    }
  } catch (error) {
    console.error('[unified-sync] Error in syncArtistsForTrendingShows:', error);
    throw error;
  }
}
async function syncArtist(input: SyncRequest): Promise<SyncResult> {
  console.log('[unified-sync] Syncing artist:', JSON.stringify(input, null, 2));

  try {
    const resolvedArtistData = await resolveArtistData(input);
    let artistDataToSave = prepareArtistDataForSaving(input, resolvedArtistData);
    
    // Fetch Spotify data
    if (!artistDataToSave.spotify_id && input.entityName) {
      try {
        const spotifyArtist = await getArtistByName(input.entityName) as SpotifyArtist;
        if (spotifyArtist?.id) {
          artistDataToSave = {
            ...artistDataToSave,
            spotify_id: spotifyArtist.id,
            image_url: spotifyArtist.images?.[0]?.url || artistDataToSave.image_url,
            genres: spotifyArtist.genres || artistDataToSave.genres,
          };
          console.log(`[unified-sync] Spotify data fetched for ${input.entityName}`);
        } else {
          console.log(`[unified-sync] No Spotify data found for ${input.entityName}`);
        }
      } catch (spotifyError) {
        console.error(`[unified-sync] Error fetching Spotify data for ${input.entityName}:`, spotifyError);
        if (spotifyError instanceof Error) {
          console.error('Spotify error details:', {
            name: spotifyError.name,
            message: spotifyError.message,
            stack: spotifyError.stack
          });
        }
      }
    }
    
    // Fetch Ticketmaster data
    if (!artistDataToSave.ticketmaster_id && input.entityName) {
      try {
        const ticketmasterArtist = await fetchArtistByName(input.entityName);
        if (ticketmasterArtist?.id) {
          artistDataToSave.ticketmaster_id = ticketmasterArtist.id;
          console.log(`[unified-sync] Ticketmaster data fetched for ${input.entityName}`);
        } else {
          console.log(`[unified-sync] No Ticketmaster data found for ${input.entityName}`);
        }
      } catch (ticketmasterError) {
        console.error(`[unified-sync] Error fetching Ticketmaster data for ${input.entityName}:`, ticketmasterError);
        if (ticketmasterError instanceof Error) {
          console.error('Ticketmaster error details:', {
            name: ticketmasterError.name,
            message: ticketmasterError.message,
            stack: ticketmasterError.stack
          });
        }
      }
    }
    
    const savedArtist = await saveArtistToDatabase(artistDataToSave);
    console.log(`[unified-sync] Artist saved to database: ${savedArtist.name} (ID: ${savedArtist.id})`);
    
    // Sync dependencies (shows, tracks, setlists)
    await syncArtistDependencies(savedArtist, input.options);

    // Fetch and save latest shows
    if (savedArtist.ticketmaster_id) {
      try {
        const latestShows = await fetchArtistEvents(savedArtist.ticketmaster_id);
        console.log(`[unified-sync] Fetched ${latestShows.length} shows for ${savedArtist.name}`);
        for (const show of latestShows) {
          await saveShow(show, savedArtist.id);
        }
      } catch (showsError) {
        console.error(`[unified-sync] Error fetching/saving shows for ${savedArtist.name}:`, showsError);
        if (showsError instanceof Error) {
          console.error('Shows error details:', {
            name: showsError.name,
            message: showsError.message,
            stack: showsError.stack
          });
        }
      }
    } else {
      console.log(`[unified-sync] Skipping show fetch for ${savedArtist.name} (no Ticketmaster ID)`);
    }

    // Fetch and save Spotify tracks
    if (savedArtist.spotify_id) {
      try {
        await syncSpotifyTracks(savedArtist, input.options);
      } catch (tracksError) {
        console.error(`[unified-sync] Error syncing Spotify tracks for ${savedArtist.name}:`, tracksError);
        if (tracksError instanceof Error) {
          console.error('Tracks error details:', {
            name: tracksError.name,
            message: tracksError.message,
            stack: tracksError.stack
          });
        }
      }
    } else {
      console.log(`[unified-sync] Skipping Spotify track sync for ${savedArtist.name} (no Spotify ID)`);
    }

    return {
      success: true,
      message: `Successfully synced artist ${savedArtist.name} (ID: ${savedArtist.id})`,
      artist: savedArtist,
    };
  } catch (error: unknown) {
    console.error('[unified-sync/syncArtist] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during artist sync',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
    };
  }
}

async function fetchArtistByName(name: string): Promise<{ id: string } | null> {
  try {
    const artist = await searchTicketmasterArtistByName(name);
    return artist ? { id: artist.id } : null;
  } catch (error) {
    console.error('[unified-sync/fetchArtistByName] Error:', error);
    return null;
  }
}

async function updateArtistInDatabase(artist: Artist): Promise<void> {
  const { error } = await supabaseClientInternal
    .from('artists')
    .update(artist)
    .eq('id', artist.id);
  
  if (error) {
    throw new Error(`Failed to update artist in database: ${error.message}`);
  }
}

async function resolveArtistData(input: SyncRequest): Promise<Partial<Artist> | null> {
  let resolvedArtistData: Partial<Artist> | null = null;

  resolvedArtistData = await retry(async () => {
    for (const [field, value] of [['id', input.entityId], ['ticketmaster_id', input.ticketmasterId], ['spotify_id', input.spotifyId]]) {
      if (value) {
        const { data, error } = await supabaseClientInternal
          .from('artists')
          .select('*')
          .eq(field as string, value)
          .maybeSingle();
        
        if (error) throw error;
        if (data) return data;
      }
    }
    return null;
  }, RETRY_OPTIONS);

  if (resolvedArtistData) {
    console.log(`[unified-sync/syncArtist] Found artist: ${resolvedArtistData.name}`);
    return resolvedArtistData;
  }

  if (input.entityName) {
    console.log(`[unified-sync/syncArtist] Attempting to resolve artist by name via Spotify: ${input.entityName}`);
    const spotifyArtist = await getArtistByName(input.entityName);
    if (spotifyArtist?.id) {
      input.spotifyId = spotifyArtist.id;
      const { data, error } = await supabaseClientInternal
        .from('artists')
        .select('*')
        .eq('spotify_id', input.spotifyId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        console.log(`[unified-sync/syncArtist] Found existing artist via Spotify ID: ${data.name}`);
        return data;
      }
    }
  }

  console.log(`[unified-sync/syncArtist] Artist not found, will create new entry`);
  return null;
}

function prepareArtistDataForSaving(input: SyncRequest, resolvedArtistData: Partial<Artist> | null): Partial<Artist> {
  const artistDataToSave: Partial<Artist> = {
    ...(resolvedArtistData || {}),
    name: input.entityName || resolvedArtistData?.name,
    ticketmaster_id: input.ticketmasterId || resolvedArtistData?.ticketmaster_id,
    spotify_id: input.spotifyId || resolvedArtistData?.spotify_id,
    image_url: input.imageUrl || resolvedArtistData?.image_url,
    genres: input.genres || resolvedArtistData?.genres,
    updated_at: new Date().toISOString()
  };
  
  if (!artistDataToSave.name || (!artistDataToSave.ticketmaster_id && !artistDataToSave.spotify_id)) {
    throw new Error('Failed to resolve necessary artist identifiers (name and external ID).');
  }

  return artistDataToSave;
}

async function saveArtistToDatabase(artistData: Partial<Artist>): Promise<Artist> {
  console.log('[unified-sync/syncArtist][DEBUG] Upserting artist:', JSON.stringify(artistData, null, 2));
  const { data: savedArtist, error: saveError } = await supabaseClientInternal
    .from('artists')
    .upsert(artistData)
    .select()
    .single();

  if (saveError || !savedArtist) {
    console.error('[unified-sync/syncArtist][DEBUG] Error returned from artist upsert:', saveError);
    throw new Error(`Failed to save artist to database: ${saveError?.message || 'Unknown error'}`);
  }
  console.log(`[unified-sync/syncArtist] Artist saved/updated: ${savedArtist.id}, Name: ${savedArtist.name}`);
  return savedArtist;
}

async function syncArtistDependencies(savedArtist: Artist, options?: SyncOptions): Promise<void> {
  await Promise.all([
    syncSpotifyTracks(savedArtist, options),
    syncSetlistFmSetlists(savedArtist, options),
    syncTicketmasterShows(savedArtist, options)
  ]);
}

async function syncSpotifyTracks(artist: Artist, options?: SyncOptions): Promise<void> {
  if (!artist.spotify_id || options?.skipDependencies) return;

  console.log(`[unified-sync/syncArtist] Fetching tracks for artist: ${artist.name} (Spotify ID: ${artist.spotify_id})`);
  try {
    const tracksResult = await getArtistAllTracks(artist.spotify_id);
    console.log(`[unified-sync/syncArtist][DEBUG] Raw Spotify API response:`, JSON.stringify(tracksResult, null, 2));
    console.log(`[unified-sync/syncArtist] Found ${tracksResult.tracks.length} tracks from Spotify.`);

    // Prepare data for artists.stored_tracks
    const storedTracksData = tracksResult.tracks.map(track => ({
      id: track.id,
      name: track.name,
      preview_url: track.preview_url,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      album_name: track.album?.name,
      album_image_url: track.album?.images?.[0]?.url
    }));

    // Update artist record with stored_tracks
    const { error: artistUpdateError } = await supabaseClientInternal
      .from('artists')
      .update({ 
        stored_tracks: storedTracksData,
        last_spotify_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
       })
      .eq('id', artist.id);

    if (artistUpdateError) {
      console.error(`[unified-sync/syncArtist] Error updating artist ${artist.id} with stored_tracks:`, artistUpdateError);
      // Decide if we should proceed with individual song saving or throw
    } else {
      console.log(`[unified-sync/syncArtist] Updated artist ${artist.id} with ${storedTracksData.length} stored tracks.`);
    }

    // Save individual songs to the 'songs' table (optional, could be removed if stored_tracks is sufficient)
    const savePromises = tracksResult.tracks.map(track => {
      const songData = {
        spotify_id: track.id,
        name: track.name,
        artist_id: artist.id,
        // spotify_url: track.external_urls?.spotify, // Removed, not in schema
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        album_name: track.album?.name,
        album_image_url: track.album?.images?.[0]?.url, // Corrected field name
        updated_at: new Date().toISOString()
      };
      console.log('[unified-sync/syncArtist][DEBUG] Upserting song:', JSON.stringify(songData, null, 2));
      return supabaseClientInternal
        .from('songs')
        .upsert(songData, { onConflict: 'spotify_id' });
    });
    await Promise.all(savePromises);
    console.log(`[unified-sync/syncArtist] Saved/Updated ${tracksResult.tracks.length} songs in 'songs' table.`);

  } catch (error) {
    console.error('[unified-sync/syncArtist] Error syncing Spotify tracks:', error);
    // Consider re-throwing or handling more gracefully
  }
}

async function syncSetlistFmSetlists(artist: Artist, options?: SyncOptions): Promise<void> {
  if (options?.skipDependencies || !options?.includeSetlists) return;

  console.log(`[unified-sync/syncArtist] Fetching past setlists for artist: ${artist.name} (SetlistFM ID: ${artist.setlist_fm_id || 'N/A'})`);
  try {
    const setlistsResponse = await fetchArtistSetlists(artist.name, artist.setlist_fm_id);
    if (setlistsResponse.setlist && setlistsResponse.setlist.length > 0) {
      console.log(`[unified-sync/syncArtist] Found ${setlistsResponse.setlist.length} past setlists, processing up to 10...`);
      const setlistsToProcess = setlistsResponse.setlist.slice(0, 10);
      for (const setlist of setlistsToProcess) {
        try {
          await processSetlist(setlist, artist);
        } catch (setlistError) {
          console.error(`[unified-sync/syncArtist] Error processing setlist:`, setlistError);
        }
      }
      console.log(`[unified-sync/syncArtist] Finished processing setlists for ${artist.name}`);
    } else {
      console.log(`[unified-sync/syncArtist] No past setlists found on Setlist.fm for ${artist.name}`);
    }
  } catch (error) {
    console.error('[unified-sync/syncArtist] Error fetching Setlist.fm data:', error);
  }
}

async function processSetlist(setlist: any, artist: Artist | string): Promise<void> {
  const artistId = typeof artist === 'string' ? artist : artist.id;
  const artistName = typeof artist === 'string' ? '' : artist.name;

  const processedData = processSetlistData(setlist);
  const showData = {
    name: `${artistName} at ${processedData.venue.name}`,
    date: processedData.eventDate || new Date().toISOString(),
    artist_id: artistId,
    ticketmaster_id: `setlist_${processedData.setlist_id}`,
    venue: {
      name: processedData.venue.name,
      city: processedData.venue.city,
      country: processedData.venue.country
    }
  };
  
  const savedShow = await saveShow(showData, artistId);
  if (savedShow?.id) {
    await saveSetlistAndSongs(processedData, savedShow.id, artistId);
    console.log(`[unified-sync/syncArtist] Processed and saved setlist for show: ${savedShow.name}`);
  } else {
    console.warn(`[unified-sync/syncArtist] Failed to save show for setlist ${processedData.setlist_id}`);
  }

  if (typeof artist === 'string') {
    const { data: artistSongs } = await supabaseClientInternal
      .from('songs')
      .select('id, name')
      .eq('artist_id', artistId);

    if (artistSongs && artistSongs.length > 0) {
      const { data: savedSetlist, error: setlistError } = await supabaseClientInternal
        .from('setlists')
        .insert({
          show_id: savedShow!.id,
          artist_id: artistId,
          date: showData.date,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!setlistError && savedSetlist) {
        const selectedSongs = [...artistSongs]
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);

        await supabaseClientInternal
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
}

async function processSetlists(setlists: any[], artist: Artist): Promise<void> {
  try {
    for (const setlist of setlists) {
      const processedData = processSetlistData(setlist);
      const showData = {
        name: `${artist.name} at ${processedData.venue.name}`,
        date: processedData.eventDate || new Date().toISOString(),
        artist_id: artist.id,
        ticketmaster_id: `setlist_${processedData.setlist_id}`,
        venue: {
          name: processedData.venue.name,
          city: processedData.venue.city,
          country: processedData.venue.country
        }
      };
      
      const savedShow = await saveShow({
        name: showData.name,
        ticketmaster_id: showData.ticketmaster_id,
        date: showData.date,
      }, artist.id, undefined);

      if (!savedShow) {
        throw new Error(`Failed to save show: ${showData.name}`);
      }
      if (savedShow?.id) {
        await saveSetlistAndSongs(processedData, savedShow.id, artist.id);
      } else {
        console.warn(`[unified-sync/syncArtist Background] Failed to save show for setlist ${processedData.setlist_id}`);
      }
    }
    console.log(`[unified-sync/syncArtist Background] Finished processing setlists.`);
  } catch (backgroundError) {
    console.error('[unified-sync/syncArtist Background] Setlist processing error:', backgroundError);
  }
}

async function saveSetlistAndSongs(processedData: any, showId: string, artistId: string): Promise<void> {
  const { data: savedSetlist, error: setlistSaveError } = await supabaseClientInternal
    .from('setlists')
    .upsert({
      setlist_fm_id: processedData.setlist_id,
      artist_id: artistId,
      show_id: showId,
      date: processedData.eventDate || undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setlist_fm_id' })
    .select('id')
    .single();

  if (setlistSaveError) {
    console.error(`[unified-sync/syncArtist Background] Error saving setlist record ${processedData.setlist_id}:`, setlistSaveError);
  } else if (savedSetlist?.id) {
    console.log(`[unified-sync/syncArtist Background] Saving songs for setlist ${savedSetlist.id}`);
    await saveSetlistSongs(savedSetlist.id, artistId, processedData.songs);
  }
}

async function syncTicketmasterShows(artist: Artist, options?: SyncOptions): Promise<void> {
  if (!artist.ticketmaster_id || options?.skipDependencies) return;

  console.log(`[unified-sync/syncArtist] Fetching Ticketmaster shows for artist: ${artist.name} (TM ID: ${artist.ticketmaster_id})`);
  try {
    const shows = await fetchArtistEvents(artist.ticketmaster_id);
    console.log(`[unified-sync/syncArtist] Found ${shows.length} shows from Ticketmaster.`);

    const results = await Promise.allSettled(shows.map(async (show) => {
      let venueId: string | undefined = undefined;
      try {
        // 1. Process Venue first
        if (show.venue) {
          console.log(`[unified-sync/syncArtist] Processing venue for show ${show.name}: ${show.venue.name}`);
          const venueResult = await syncVenue({
            entityType: 'venue',
            entityName: show.venue.name,
            ticketmasterId: show.venue.ticketmaster_id,
            venue: show.venue
          });
          if (venueResult.success && venueResult.venue) {
            venueId = venueResult.venue.id;
            console.log(`[unified-sync/syncArtist] Venue processed for show ${show.name}. Venue ID: ${venueId}`);
          } else {
            console.warn(`[unified-sync/syncArtist] Failed to process venue for show ${show.name}. Error: ${venueResult.error}`);
            // Decide if we should proceed without venueId or mark as error
          }
        } else {
          console.log(`[unified-sync/syncArtist] No venue data provided for show ${show.name}`);
        }

        // 2. Save Show with artistId and potentially venueId
        console.log(`[unified-sync/syncArtist] Processing show: ${show.name} with Artist ID: ${artist.id}, Venue ID: ${venueId}`);
        const savedShow = await saveShow(show, artist.id, venueId);
        if (!savedShow) {
          // Throw an error if saveShow explicitly returned null or failed
          throw new Error(`saveShow returned null for show ${show.name}`);
        }
        return { success: true as const, show: savedShow };

      } catch (error) {
        console.error(`[unified-sync/syncArtist] Error processing show ${show.name}:`, error);
        return { success: false as const, error, show: show as Partial<Show> };
      }
    }));

    const savedShows = results.filter((r): r is PromiseFulfilledResult<{ success: true; show: Show }> =>
      r.status === 'fulfilled' && r.value.success === true
    );
    const failedShows = results.filter((r): r is PromiseRejectedResult | PromiseFulfilledResult<{ success: false; error: unknown; show: Partial<Show> }> =>
      r.status === 'rejected' || (r.status === 'fulfilled' && r.value.success === false)
    );

    console.log(`[unified-sync/syncArtist] Ticketmaster shows sync complete. Saved: ${savedShows.length}, Errors: ${failedShows.length}`);

    if (failedShows.length > 0) {
      console.error(`[unified-sync/syncArtist] ${failedShows.length} shows failed to save. Details:`);
      failedShows.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`  ${index + 1}. Rejected: ${result.reason}`);
        } else {
          console.error(`  ${index + 1}. Failed: ${result.value.show.name || 'Unknown'}, Error:`, result.value.error);
          if (result.value.error instanceof Error) {
            console.error('    Error details:', {
              name: result.value.error.name,
              message: result.value.error.message,
              stack: result.value.error.stack
            });
          }
        }
      });
    }

    await updateArtistLastSync(artist.id);
  } catch (showsError) {
    console.error('[unified-sync/syncArtist] Error in Ticketmaster shows sync process:', showsError);
    if (showsError instanceof Error) {
      console.error('Error details:', {
        name: showsError.name,
        message: showsError.message,
        stack: showsError.stack
      });
    }
    throw showsError; // Re-throw to allow caller to handle the error
  }
}

async function saveShow(show: Partial<Show>, artistId?: string, venueId?: string): Promise<Show | null> {
  if (!show.name || !show.ticketmaster_id) {
    console.error('[unified-sync] Error saving show: name and ticketmaster_id are required');
    return null;
  }

  // Check if show already exists
  const { data: existingShow, error: checkError } = await supabaseClientInternal
    .from('shows')
    .select('id')
    .eq('ticketmaster_id', show.ticketmaster_id)
    .maybeSingle();

  if (checkError) {
    console.error(`[unified-sync] Error checking for existing show ${show.ticketmaster_id}:`, checkError);
    // Decide if we should proceed or return null
  }
  const isNewShow = !existingShow;

  const showData: Partial<Show> = {
    name: show.name,
    date: show.date,
    image_url: show.image_url,
    ticket_url: show.ticket_url,
    artist_id: artistId,
    venue_id: venueId,
    ticketmaster_id: show.ticketmaster_id,
    popularity: show.popularity ?? 0,
    updated_at: new Date().toISOString()
  };

  console.log(`[unified-sync][DEBUG] Upserting show (isNew: ${isNewShow}):`, JSON.stringify(showData, null, 2));
  const { data: savedShow, error } = await supabaseClientInternal
    .from('shows')
    .upsert(showData, { onConflict: 'ticketmaster_id' })
    .select()
    .single();

  if (error) {
    console.error('[unified-sync][DEBUG] Error returned from show upsert:', error);
    console.error(`[unified-sync] Error saving show ${show.name}:`, error);
    return null;
  }

  console.log(`[unified-sync] Show saved/updated: ${savedShow.id}, Name: ${savedShow.name}`);

  // --- Create Default Setlist for NEW shows ---
  if (isNewShow && savedShow && artistId) {
    console.log(`[unified-sync] Creating default setlist for new show: ${savedShow.id}`);
    try {
      await createDefaultSetlist(savedShow.id, artistId);
    } catch (setlistError) {
      console.error(`[unified-sync] Failed to create default setlist for show ${savedShow.id}:`, setlistError);
      // Log error but don't fail the entire show save
    }
  }
  // --------------------------------------------

  return savedShow;
}

async function createDefaultSetlist(showId: string, artistId: string): Promise<void> {
  // 1. Fetch artist's stored tracks
  const { data: artistData, error: artistFetchError } = await supabaseClientInternal
    .from('artists')
    .select('stored_tracks')
    .eq('id', artistId)
    .single();

  if (artistFetchError || !artistData) {
    console.error(`[unified-sync/createDefaultSetlist] Error fetching artist ${artistId} data:`, artistFetchError);
    return; // Cannot proceed without artist tracks
  }

  const storedTracks = artistData.stored_tracks as Array<{ id: string; name: string; [key: string]: any }> | null;

  if (!storedTracks || storedTracks.length === 0) {
    console.log(`[unified-sync/createDefaultSetlist] Artist ${artistId} has no stored tracks. Skipping default setlist.`);
    return;
  }

  // 2. Select 5 random unique songs
  const selectedSongs = [...storedTracks]
    .sort(() => 0.5 - Math.random()) // Shuffle
    .slice(0, 5);

  if (selectedSongs.length === 0) {
    console.log(`[unified-sync/createDefaultSetlist] No songs selected for default setlist for show ${showId}.`);
    return;
  }

  console.log(`[unified-sync/createDefaultSetlist] Selected ${selectedSongs.length} random songs for show ${showId}.`);

  // 3. Create Setlist record
  const { data: newSetlist, error: setlistInsertError } = await supabaseClientInternal
    .from('setlists')
    .insert({
      show_id: showId,
      artist_id: artistId,
      status: 'draft', // Default status
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (setlistInsertError || !newSetlist) {
    console.error(`[unified-sync/createDefaultSetlist] Error creating setlist record for show ${showId}:`, setlistInsertError);
    return; // Cannot proceed without setlist record
  }

  console.log(`[unified-sync/createDefaultSetlist] Created setlist record ${newSetlist.id} for show ${showId}.`);

  // 4. Create Setlist_Songs records
  const setlistSongsData = selectedSongs.map((song, index) => ({
    setlist_id: newSetlist.id,
    song_id: song.id, // Assuming stored_tracks has the song's UUID from the 'songs' table
    name: song.name,
    position: index + 1,
    artist_id: artistId,
    vote_count: 0,
    updated_at: new Date().toISOString()
  }));

  const { error: songsInsertError } = await supabaseClientInternal
    .from('setlist_songs')
    .insert(setlistSongsData);

  if (songsInsertError) {
    console.error(`[unified-sync/createDefaultSetlist] Error inserting songs for setlist ${newSetlist.id}:`, songsInsertError);
    // Consider cleanup or logging
  } else {
    console.log(`[unified-sync/createDefaultSetlist] Successfully inserted ${setlistSongsData.length} songs for default setlist ${newSetlist.id}.`);
  }
}

interface Show {
  id: string;
  name: string;
  date: string;
  image_url?: string;
  ticket_url?: string;
  artist_id?: string;
  venue_id?: string;
  ticketmaster_id: string;
  popularity: number;
  updated_at: string;
}

async function updateArtistLastSync(artistId: string): Promise<void> {
  const { error: syncUpdateError } = await supabaseClientInternal
    .from('artists')
    .update({
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', artistId);

  if (syncUpdateError) {
    console.error('[unified-sync/syncArtist] Error updating artist last_sync timestamp:', syncUpdateError);
  }
}

async function syncVenue(input: SyncRequest): Promise<SyncResult> {
  console.log('[unified-sync] Syncing venue:', input);

  return await retry(async () => {
    const venueData = {
      id: input.entityId,
      name: input.entityName,
      ticketmaster_id: input.ticketmasterId,
      city: input.venue?.city,
      state: input.venue?.state,
      country: input.venue?.country,
      updated_at: new Date().toISOString()
    };

    const { data: savedVenue, error } = await supabaseClientInternal
      .from('venues')
      .upsert(venueData, { onConflict: 'ticketmaster_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save venue to database: ${error.message}`);
    }

    if (!savedVenue) {
      throw new Error('Failed to save venue to database: No data returned');
    }

    console.log(`[unified-sync/syncVenue] Venue saved/updated: ${savedVenue.id}, Name: ${savedVenue.name}`);

    return {
      success: true,
      venue: savedVenue,
    };
  }, RETRY_OPTIONS);
}

async function syncShow(input: SyncRequest): Promise<SyncResult> {
  console.log('[unified-sync] Syncing show:', input);

  return await retry(async () => {
    // Fetch or create venue
    let venueId: string | null = null;
    if (input.venue) {
      const { venue: savedVenue } = await syncVenue({
        entityType: 'venue',
        entityName: input.venue.name,
        ticketmasterId: input.venue.ticketmaster_id,
        venue: input.venue
      });
      if (savedVenue) {
        venueId = savedVenue.id;
      }
    }

    if (!input.artistId) {
      throw new Error('Artist ID is required to save a show');
    }

    // Save or update show
    const savedShow = await saveShow({
      name: input.entityName || '',
      ticketmaster_id: input.ticketmasterId || '',
      date: input.date,
      image_url: input.imageUrl,
      ticket_url: input.ticketUrl,
    }, input.artistId || undefined, venueId || undefined);

    if (!savedShow) {
      throw new Error(`Failed to save show: ${input.entityName}`);
    }

    return {
      success: true,
      show: savedShow,
    };
  }, RETRY_OPTIONS);
}

async function syncSong(input: SyncRequest): Promise<SyncResult> {
  console.log('[unified-sync] Syncing song:', input);

  return await retry(async () => {
    if (!input.entityName || !input.spotifyId) {
      throw new Error('Song name and Spotify ID are required');
    }

    const songData = {
      name: input.entityName,
      spotify_id: input.spotifyId,
      artist_id: input.entityId,
      updated_at: new Date().toISOString()
    };

    console.log('[unified-sync][DEBUG] Upserting song:', JSON.stringify(songData, null, 2));
    const { data: savedSong, error } = await supabaseClientInternal
      .from('songs')
      .upsert(songData, { onConflict: 'spotify_id' })
      .select()
      .single();

    if (error) {
      console.error('[unified-sync][DEBUG] Error returned from song upsert:', error);
      throw new Error(`Failed to save song to database: ${error.message}`);
    }

    if (!savedSong) {
      throw new Error('Failed to save song to database: No data returned');
    }

    console.log(`[unified-sync/syncSong] Song saved/updated: ${savedSong.id}, Name: ${savedSong.name}`);

    return {
      success: true,
      song: savedSong
    };
  }, RETRY_OPTIONS);
}

async function syncTrendingShows(): Promise<SyncResult> {
  console.log('[unified-sync] Fetching trending shows');

  return await retry(async () => {
    const shows = await fetchTrendingShows();
    console.log(`[unified-sync] Found ${shows.length} trending shows to sync`);
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const show of shows) {
      try {
        if (!show.ticketmaster_id) {
          console.warn('[unified-sync] Show missing ticketmaster_id, skipping:', show.name);
          continue;
        }

        const existingShow = await checkExistingShow(show.ticketmaster_id);
        if (existingShow) {
          await updateShowPopularity(existingShow.id, show.popularity || 0);
          savedCount++;
          continue;
        }

        const artistId = await processArtist(show.artist);
        const venueId = await processVenue(show.venue);
        const savedShow = await saveShow(show, artistId, venueId);

        if (savedShow) {
          await processSetlist(savedShow, artistId);
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
  }, RETRY_OPTIONS);
}

async function checkExistingShow(ticketmasterId: string) {
  const { data: existingShow } = await supabaseClientInternal
    .from('shows')
    .select('id, ticketmaster_id')
    .eq('ticketmaster_id', ticketmasterId)
    .single();
  return existingShow;
}

async function updateShowPopularity(showId: string, popularity: number) {
  await supabaseClientInternal
    .from('shows')
    .update({
      popularity,
      updated_at: new Date().toISOString()
    })
    .eq('id', showId);
  console.log(`[unified-sync] Updated existing show: ${showId}`);
}

async function processArtist(artist: any) {
  if (!artist) return null;

  const { data: savedArtist } = await supabaseClientInternal
    .from('artists')
    .select('id')
    .eq('ticketmaster_id', artist.ticketmaster_id)
    .single();

  if (savedArtist) return savedArtist.id;

  const { data: newArtist } = await supabaseClientInternal
    .from('artists')
    .insert({
      name: artist.name,
      ticketmaster_id: artist.ticketmaster_id,
      image_url: artist.image_url,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (newArtist) {
    await supabaseClientInternal.functions.invoke('sync-artist', {
      body: {
        artistId: newArtist.id,
        ticketmasterId: artist.ticketmaster_id
      }
    });
    return newArtist.id;
  }

  return null;
}

async function processVenue(venue: any) {
  if (!venue) return null;

  const { data: savedVenue } = await supabaseClientInternal
    .from('venues')
    .select('id')
    .eq('ticketmaster_id', venue.ticketmaster_id)
    .single();

  if (savedVenue) return savedVenue.id;

  const { data: newVenue } = await supabaseClientInternal
    .from('venues')
    .insert({
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      ticketmaster_id: venue.ticketmaster_id,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  return newVenue ? newVenue.id : null;
}

// This function has been moved and updated earlier in the file

// This function has been merged with the one above
