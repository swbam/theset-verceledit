
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getArtistTopTracksFromDb, getStoredTracksFromDb } from "@/lib/spotify/utils";
import { SpotifyTrack } from "@/lib/spotify/types";

/**
 * Create or get setlist for a show
 */
export async function getOrCreateSetlistForShow(showId: string, artistId?: string) {
  try {
    if (!showId) return null;
    
    console.log(`Getting or creating setlist for show ${showId} with artist ${artistId || 'unknown'}`);
    
    // Check if setlist exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking setlist in database:", checkError);
      return null;
    }
    
    // If setlist exists, return it
    if (existingSetlist) {
      console.log(`Found existing setlist ${existingSetlist.id} for show ${showId}`);
      return existingSetlist.id;
    }
    
    // Create new setlist
    console.log(`Creating new setlist for show ${showId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created new setlist ${newSetlist.id} for show ${showId}`);
    
    // If we have an artist ID, auto-populate the setlist with random tracks
    if (artistId) {
      await autoPopulateSetlistWithRandomTracks(newSetlist.id, artistId);
    } else {
      console.warn("No artist_id provided for setlist creation, cannot auto-populate with tracks");
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in getOrCreateSetlistForShow:", error);
    return null;
  }
}

/**
 * Helper function to get random tracks from an array
 */
function getRandomTracks(tracks: any[], count = 5) {
  if (!tracks || tracks.length <= count) return tracks;
  
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Try to get tracks from the artist's stored_tracks first, then fall back to top_tracks table
 */
async function getTracksForArtist(artistId: string): Promise<SpotifyTrack[]> {
  try {
    // First try to get tracks from the artist's stored_tracks
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (!artistError && artist?.stored_tracks && Array.isArray(artist.stored_tracks) && artist.stored_tracks.length > 0) {
      console.log(`Using ${artist.stored_tracks.length} tracks from artist.stored_tracks`);
      // Cast the JSON to SpotifyTrack[] with an intermediate unknown cast for type safety
      return artist.stored_tracks as unknown as SpotifyTrack[];
    }
    
    // Fallback to top_tracks table
    console.log("No stored_tracks found, falling back to top_tracks table");
    return await getStoredTracksFromDb(artistId);
  } catch (error) {
    console.error("Error getting tracks for artist:", error);
    return [];
  }
}

/**
 * Auto-populate a setlist with 5 random tracks from the artist's catalog
 */
export async function autoPopulateSetlistWithRandomTracks(setlistId: string, artistId: string) {
  try {
    console.log(`Auto-populating setlist ${setlistId} with random tracks for artist ${artistId}`);
    
    // Get tracks from artist's stored_tracks or top_tracks
    const allTracks = await getTracksForArtist(artistId);
    
    if (!allTracks || allTracks.length === 0) {
      console.log(`No tracks found for artist ${artistId}, skipping auto-population`);
      return;
    }
    
    // Get 5 random tracks from the collection
    const randomTracks = getRandomTracks(allTracks, 5);
    console.log(`Selected ${randomTracks.length} random tracks from ${allTracks.length} available tracks`);
    
    // Add each track to the setlist with 0 votes
    for (const track of randomTracks) {
      if (track && track.id) {
        await addSongToSetlist(setlistId, track.id);
      }
    }
    
    console.log(`Successfully populated setlist ${setlistId} with ${randomTracks.length} random tracks`);
  } catch (error) {
    console.error("Error auto-populating setlist:", error);
  }
}

/**
 * Add song to setlist
 */
export async function addSongToSetlist(setlistId: string, trackId: string, userId?: string) {
  try {
    if (!setlistId || !trackId) return null;
    
    console.log(`Adding song ${trackId} to setlist ${setlistId}`);
    
    // Check if song already exists in setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', trackId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking song in setlist:", checkError);
      return null;
    }
    
    // If song exists, return it
    if (existingSong) {
      console.log(`Song ${trackId} already exists in setlist ${setlistId}`);
      return existingSong.id;
    }
    
    // Add new song to setlist
    console.log(`Inserting new song ${trackId} to setlist ${setlistId}`);
    const { data: newSong, error: createError } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0,
        suggested_by: userId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error adding song to setlist:", createError);
      return null;
    }
    
    console.log(`Successfully added song ${trackId} to setlist ${setlistId}`);
    return newSong.id;
  } catch (error) {
    console.error("Error in addSongToSetlist:", error);
    return null;
  }
}

/**
 * Get setlist songs with vote counts for a specific show
 */
export async function getSetlistSongsForShow(showId: string) {
  try {
    if (!showId) return [];
    
    console.log(`Fetching setlist songs for show ${showId}`);
    
    // Get setlist for show
    const { data: setlist, error: setlistError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (setlistError || !setlist) {
      console.error("Error getting setlist for show:", setlistError);
      return [];
    }
    
    console.log(`Found setlist ${setlist.id} for show ${showId}`);
    
    // Get setlist songs with related track info
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        votes,
        track_id,
        top_tracks (
          id,
          name,
          spotify_url,
          preview_url,
          album_name,
          album_image_url,
          popularity
        )
      `)
      .eq('setlist_id', setlist.id)
      .order('votes', { ascending: false });
    
    if (songsError) {
      console.error("Error getting setlist songs:", songsError);
      return [];
    }
    
    console.log(`Found ${songs?.length || 0} songs for setlist ${setlist.id}`);
    
    return songs.map(song => ({
      id: song.id,
      trackId: song.track_id,
      votes: song.votes,
      name: song.top_tracks?.name || 'Unknown Song',
      spotifyUrl: song.top_tracks?.spotify_url,
      previewUrl: song.top_tracks?.preview_url,
      albumName: song.top_tracks?.album_name,
      albumImageUrl: song.top_tracks?.album_image_url,
      popularity: song.top_tracks?.popularity
    }));
  } catch (error) {
    console.error("Error in getSetlistSongsForShow:", error);
    return [];
  }
}
