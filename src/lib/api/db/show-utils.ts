import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Create a new show record in the database
export async function createShow(showData) {
  try {
    const { data: show, error } = await supabase
      .from('shows')
      .insert(showData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating show:', error.message);
      return null;
    }
    
    return show;
  } catch (error) {
    console.error('Error creating show:', error);
    return null;
  }
}

// Create a setlist for a show
export async function createSetlistForShow(showId, initialSongs = []) {
  try {
    console.log(`Creating setlist for show ${showId}`);
    
    // First check if a setlist already exists for this show
    const { data: existingSetlist, error: fetchError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking for existing setlist:', fetchError.message);
      return null;
    }
    
    // If a setlist exists, return its ID
    if (existingSetlist?.id) {
      console.log(`Setlist already exists for show ${showId}, ID: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // If we're here, we need to create a new setlist
    // We'll create it directly instead of using an RPC
    const { data: newSetlist, error: insertError } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Error creating setlist:', insertError.message);
      toast.error("Could not create setlist");
      return null;
    }
    
    console.log(`Created new setlist manually, ID: ${newSetlist.id}`);
    
    // If we have initial songs, add them to the setlist
    if (initialSongs && initialSongs.length > 0) {
      await addSongsToSetlist(newSetlist.id, initialSongs);
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error('Error in createSetlistForShow:', error);
    return null;
  }
}

// Add songs to a setlist
export async function addSongsToSetlist(setlistId, songs) {
  try {
    if (!setlistId || !songs || !Array.isArray(songs) || songs.length === 0) {
      console.log('No songs to add or invalid setlist ID');
      return false;
    }
    
    console.log(`Adding ${songs.length} songs to setlist ${setlistId}`);
    
    // Prepare songs with setlist_id and initial votes
    const songsToInsert = songs.map((song, index) => ({
      setlist_id: setlistId,
      track_id: song.id,
      suggested_by: null,
      votes: song.votes || 0,
      created_at: new Date().toISOString()
    }));
    
    // Insert all songs at once
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert(songsToInsert)
      .select();
    
    if (error) {
      console.error('Error adding songs to setlist:', error.message);
      return false;
    }
    
    console.log(`Successfully added ${data.length} songs to setlist ${setlistId}`);
    return true;
  } catch (error) {
    console.error('Error in addSongsToSetlist:', error);
    return false;
  }
}

// Get a show by ID
export async function getShowById(showId) {
  try {
    if (!showId) return null;
    
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .eq('id', showId)
      .single();
    
    if (error) {
      console.error('Error fetching show:', error.message);
      return null;
    }
    
    return show;
  } catch (error) {
    console.error('Error in getShowById:', error);
    return null;
  }
}

// Get shows for an artist
export async function getShowsForArtist(artistId, limit = 10) {
  try {
    if (!artistId) return [];
    
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching artist shows:', error.message);
      return [];
    }
    
    return shows;
  } catch (error) {
    console.error('Error in getShowsForArtist:', error);
    return [];
  }
}

// Get recent shows
export async function getRecentShows(limit = 10) {
  try {
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent shows:', error.message);
      return [];
    }
    
    return shows;
  } catch (error) {
    console.error('Error in getRecentShows:', error);
    return [];
  }
}

// Get trending shows
export async function getTrendingShows(limit = 10) {
  try {
    // This is a placeholder for actual trending logic
    // In a real app, you might have a more complex query based on votes, views, etc.
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .order('date', { ascending: true })
      .gte('date', new Date().toISOString())
      .limit(limit);
    
    if (error) {
      console.error('Error fetching trending shows:', error.message);
      return [];
    }
    
    return shows;
  } catch (error) {
    console.error('Error in getTrendingShows:', error);
    return [];
  }
}
