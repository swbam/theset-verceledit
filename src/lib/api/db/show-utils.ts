
import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks } from '@/lib/spotify';
import { saveTracksToDb } from '@/lib/spotify/utils';

/**
 * Create a setlist for a show if it doesn't exist
 */
export async function createSetlistForShow(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show data provided");
      return null;
    }
    
    console.log(`Checking for existing setlist for show ${show.id}`);
    
    // Check if a setlist already exists for this show
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }
    
    // If a setlist already exists, return it
    if (existingSetlist) {
      console.log(`Found existing setlist ${existingSetlist.id} for show ${show.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    console.log(`Creating new setlist for show ${show.id}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: show.id,
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created setlist ${newSetlist.id} for show ${show.id}`);
    
    // If we have an artist ID, fetch and add initial tracks
    if (show.artist_id) {
      console.log(`Fetching initial tracks for artist ${show.artist_id}`);
      try {
        // Get artist's top tracks from Spotify
        const { tracks } = await getArtistTopTracks(show.artist_id, 5);
        
        if (tracks && tracks.length > 0) {
          console.log(`Adding ${tracks.length} initial tracks to setlist`);
          
          // Save tracks to database
          await saveTracksToDb(show.artist_id, tracks);
          
          // Add tracks to setlist
          for (const track of tracks) {
            if (track.id && track.name) {
              await addTrackToSetlist(newSetlist.id, track.id);
            }
          }
        }
      } catch (error) {
        console.error("Error adding initial tracks to setlist:", error);
        // Continue anyway, the setlist is created
      }
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in createSetlistForShow:", error);
    return null;
  }
}

/**
 * Add a track to a setlist
 */
async function addTrackToSetlist(setlistId: string, trackId: string) {
  try {
    console.log(`Adding track ${trackId} to setlist ${setlistId}`);
    
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0
      })
      .select('id')
      .single();
    
    if (error) {
      console.error("Error adding track to setlist:", error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in addTrackToSetlist:", error);
    return null;
  }
}

/**
 * Get all shows for an artist
 */
export async function getShowsForArtist(artistId: string) {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        venue:venues (*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error("Error fetching shows for artist:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getShowsForArtist:", error);
    return [];
  }
}
