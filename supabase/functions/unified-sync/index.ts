import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchArtistEvents, fetchTrendingShows } from '../_shared/ticketmasterUtils.ts';
import { getArtistByName, getArtistAllTracks } from '../_shared/spotifyUtils.ts';
import { fetchArtistSetlists, processSetlistData } from '../_shared/setlistFmUtils.ts';
import { saveSetlistSongs } from '../_shared/setlistSongUtils.ts';
import { createClient } from '@supabase/supabase-js';
import { retry } from '../_shared/retryUtils.ts';

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
      result = await retry(() => syncTrendingShows(), RETRY_OPTIONS);

      if (result.success && result.stats?.saved && result.stats.saved > 0) {
        console.log(`[unified-sync] Syncing artists for ${result.stats.saved} trending shows`);
        await retry(() => syncArtistsForTrendingShows(result.stats!.saved), RETRY_OPTIONS);
      }
    } else {
      if (!input.entityType) {
        throw new Error('Entity type is required');
      }

      if (!input.entityId && !input.entityName && !input.ticketmasterId && !input.spotifyId) {
        throw new Error('At least one identifier (entityId, entityName, ticketmasterId, spotifyId) is required');
      }

      console.log(`[unified-sync] Syncing entity of type: ${input.entityType}`);
      result = await retry(() => syncEntity(input), RETRY_OPTIONS);
    }

    console.log('[unified-sync] Sync completed successfully');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error('[unified-sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[unified-sync] Error details: ${errorMessage}`);
    return new Response(JSON.stringify({
      error: errorMessage,
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during sync'
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
    const artistDataToSave = prepareArtistDataForSaving(input, resolvedArtistData);
    const savedArtist = await saveArtistToDatabase(artistDataToSave);
    await syncArtistDependencies(savedArtist, input.options);

    return {
      success: true,
      message: `Successfully synced artist ${savedArtist.name} (ID: ${savedArtist.id})`,
      artist: savedArtist,
    };
  } catch (error) {
    console.error('[unified-sync/syncArtist] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during artist sync',
    };
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
  console.log('[unified-sync/syncArtist] Saving artist to database:', JSON.stringify(artistData, null, 2));
  const { data: savedArtist, error: saveError } = await supabaseClientInternal
    .from('artists')
    .upsert(artistData)
    .select()
    .single();

  if (saveError || !savedArtist) {
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
    console.log(`[unified-sync/syncArtist] Found ${tracksResult.tracks.length} tracks from Spotify.`);
    
    const savePromises = tracksResult.tracks.map(track =>
      supabaseClientInternal
        .from('songs')
        .upsert({
          spotify_id: track.id,
          name: track.name,
          artist_id: artist.id,
          spotify_url: track.external_urls?.spotify,
          preview_url: track.preview_url,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          album_name: track.album?.name,
          album_image: track.album?.images?.[0]?.url,
          updated_at: new Date().toISOString()
        }, { onConflict: 'spotify_id' })
    );
    await Promise.all(savePromises);
    console.log(`[unified-sync/syncArtist] Saved/Updated ${tracksResult.tracks.length} tracks to database.`);
  } catch (error) {
    console.error('[unified-sync/syncArtist] Error syncing Spotify tracks:', error);
  }
}

async function syncSetlistFmSetlists(artist: Artist, options?: SyncOptions): Promise<void> {
  if (options?.skipDependencies || !options?.includeSetlists) return;

  console.log(`[unified-sync/syncArtist] Fetching past setlists for artist: ${artist.name} (SetlistFM ID: ${artist.setlist_fm_id || 'N/A'})`);
  try {
    const setlistsResponse = await fetchArtistSetlists(artist.name, artist.setlist_fm_id);
    if (setlistsResponse.setlist && setlistsResponse.setlist.length > 0) {
      console.log(`[unified-sync/syncArtist] Found ${setlistsResponse.setlist.length} past setlists, processing up to 5 in background...`);
      queueMicrotask(() => processSetlists(setlistsResponse.setlist.slice(0, 5), artist));
    } else {
      console.log(`[unified-sync/syncArtist] No past setlists found on Setlist.fm for ${artist.name}`);
    }
  } catch (error) {
    console.error('[unified-sync/syncArtist] Error fetching/processing Setlist.fm data:', error);
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

    const results = await Promise.all(shows.map(show => saveShow(show, artist.id, undefined)));
    const savedShowCount = results.filter(Boolean).length;
    const errorShowCount = results.length - savedShowCount;

    console.log(`[unified-sync/syncArtist] Ticketmaster shows sync complete. Saved: ${savedShowCount}, Errors: ${errorShowCount}`);

    await updateArtistLastSync(artist.id);
  } catch (showsError) {
    console.error('[unified-sync/syncArtist] Error in Ticketmaster shows sync process:', showsError);
  }
}

async function saveShow(show: Partial<Show>, artistId?: string, venueId?: string): Promise<Show | null> {
  if (!show.name || !show.ticketmaster_id) {
    console.error('[unified-sync] Error saving show: name and ticketmaster_id are required');
    return null;
  }

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

  const { data: savedShow, error } = await supabaseClientInternal
    .from('shows')
    .upsert(showData, { onConflict: 'ticketmaster_id' })
    .select()
    .single();

  if (error) {
    console.error(`[unified-sync] Error saving show ${show.name}:`, error);
    return null;
  }

  console.log(`[unified-sync] Show saved/updated: ${savedShow.id}, Name: ${savedShow.name}`);
  return savedShow;
}

interface Show {
  id: string;
  name: string;
  date: string;
  image_url?: string;
  ticket_url?: string;
  artist_id?: string | null;
  venue_id?: string | null;
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
      const { data: savedVenue } = await syncVenue({
        entityType: 'venue',
        entityName: input.venue.name,
        ticketmasterId: input.venue.ticketmaster_id,
        venue: input.venue
      });
      venueId = savedVenue.id;
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
    }, input.artistId || undefined, venueId);

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

    const { data: savedSong, error } = await supabaseClientInternal
      .from('songs')
      .upsert(songData, { onConflict: 'spotify_id' })
      .select()
      .single();

    if (error) {
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

async function processSetlist(show: any, artistId: string | null) {
  if (!artistId) return;

  const { data: artistSongs } = await supabaseClientInternal
    .from('songs')
    .select('id, name')
    .eq('artist_id', artistId);

  if (artistSongs && artistSongs.length > 0) {
    const { data: savedSetlist, error: setlistError } = await supabaseClientInternal
      .from('setlists')
      .insert({
        show_id: show.id,
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
