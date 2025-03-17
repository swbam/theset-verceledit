import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) return;
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id, updated_at')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking artist in database:", checkError);
      return;
    }
    
    // If artist exists and was updated in the last 7 days, don't update
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update if it's been more than 7 days
      if (daysSinceUpdate < 7) {
        return existingArtist;
      }
    }
    
    // Insert or update artist
    const { data, error } = await supabase
      .from('artists')
      .upsert({
        id: artist.id,
        name: artist.name,
        image: artist.image,
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        popularity: artist.popularity || 0,
        upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving artist to database:", error);
    }
    
    return existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return null;
  }
}

/**
 * Save venue to database
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) return;
    
    // Check if venue already exists
    const { data: existingVenue, error: checkError } = await supabase
      .from('venues')
      .select('id, updated_at')
      .eq('id', venue.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking venue in database:", checkError);
      return;
    }
    
    // If venue exists and was updated recently, don't update
    if (existingVenue) {
      const lastUpdated = new Date(existingVenue.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update if it's been more than 30 days (venues change rarely)
      if (daysSinceUpdate < 30) {
        return existingVenue;
      }
    }
    
    // Insert or update venue
    const { data, error } = await supabase
      .from('venues')
      .upsert({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        address: venue.address,
        postal_code: venue.postal_code,
        location: venue.location,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving venue to database:", error);
    }
    
    return existingVenue || venue;
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    return null;
  }
}

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) return;
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id, updated_at')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking show in database:", checkError);
      return;
    }
    
    // If show exists and was updated recently, don't update
    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Only update if it's been more than 24 hours
      if (hoursSinceUpdate < 24) {
        return existingShow;
      }
    }
    
    // Insert or update show
    const { data, error } = await supabase
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        artist_id: show.artist_id,
        venue_id: show.venue_id,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        genre_ids: show.genre_ids || [],
        popularity: show.popularity || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving show to database:", error);
    }
    
    return existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
  }
}

/**
 * Create or get setlist for a show
 */
export async function getOrCreateSetlistForShow(showId: string) {
  try {
    if (!showId) return null;
    
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
      return existingSetlist.id;
    }
    
    // Create new setlist
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
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in getOrCreateSetlistForShow:", error);
    return null;
  }
}

/**
 * Add song to setlist
 */
export async function addSongToSetlist(setlistId: string, trackId: string, userId?: string) {
  try {
    if (!setlistId || !trackId) return null;
    
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
      return existingSong.id;
    }
    
    // Add new song to setlist
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
    
    return newSong.id;
  } catch (error) {
    console.error("Error in addSongToSetlist:", error);
    return null;
  }
}

/**
 * Vote for a song in a setlist
 */
export async function voteForSong(setlistSongId: string, userId: string) {
  try {
    if (!setlistSongId || !userId) return false;
    
    // Add vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: setlistSongId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    
    if (voteError) {
      // If duplicate vote, ignore
      if (voteError.code === '23505') { // Unique constraint violation
        console.log("User already voted for this song");
        return true;
      }
      
      console.error("Error voting for song:", voteError);
      return false;
    }
    
    // Increment vote count
    const { error: updateError } = await supabase.rpc('increment_song_votes', { song_id: setlistSongId });
    
    if (updateError) {
      console.error("Error incrementing vote count:", updateError);
    }
    
    return true;
  } catch (error) {
    console.error("Error in voteForSong:", error);
    return false;
  }
}

/**
 * Get setlist songs with vote counts for a specific show
 */
export async function getSetlistSongsForShow(showId: string) {
  try {
    if (!showId) return [];
    
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
          album_image_url
        )
      `)
      .eq('setlist_id', setlist.id);
    
    if (songsError) {
      console.error("Error getting setlist songs:", songsError);
      return [];
    }
    
    return songs;
  } catch (error) {
    console.error("Error in getSetlistSongsForShow:", error);
    return [];
  }
}

/**
 * Update stored tracks for an artist
 */
export async function updateArtistStoredTracks(artistId: string, tracks: any[]) {
  if (!artistId || !tracks || !Array.isArray(tracks)) {
    console.error("Invalid parameters for updateArtistStoredTracks");
    return;
  }
  
  try {
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracks,
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error("Error updating artist stored tracks:", error);
    } else {
      console.log(`Updated stored tracks for artist ${artistId}:`, tracks.length);
    }
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
  }
}
