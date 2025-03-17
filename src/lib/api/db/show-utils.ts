
import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks } from '@/lib/spotify';
import { saveTracksToDb } from '@/lib/spotify/utils';
import { toast } from 'sonner';

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
    
    // Create a new setlist with direct insert
    console.log(`Creating new setlist for show ${show.id}`);
    
    // First try direct insert approach
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: show.id,
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist with direct insert:", createError);
      console.error("Show data:", show);
      
      // Try alternative approach - use RPC call if available
      try {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('create_setlist_for_show', { show_id: show.id });
          
        if (rpcError) {
          console.error("Error creating setlist via RPC:", rpcError);
          return null;
        }
        
        if (rpcResult) {
          console.log(`Created setlist via RPC: ${rpcResult}`);
          return rpcResult;
        }
      } catch (rpcError) {
        console.error("Error in RPC fallback:", rpcError);
      }
      
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
        toast.error("Failed to add initial tracks to setlist");
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
    
    // Check if track already exists in the setlist
    const { data: existingTrack, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', trackId)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing track:", checkError);
      return null;
    }
    
    if (existingTrack) {
      console.log(`Track ${trackId} already exists in setlist ${setlistId}`);
      return existingTrack.id;
    }
    
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
      
      // Try alternative approach with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: retryData, error: retryError } = await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: setlistId,
          track_id: trackId,
          votes: 0
        })
        .select('id')
        .single();
        
      if (retryError) {
        console.error("Error in retry adding track to setlist:", retryError);
        return null;
      }
      
      console.log(`Successfully added track ${trackId} to setlist ${setlistId} on retry`);
      return retryData?.id || null;
    }
    
    console.log(`Successfully added track ${trackId} to setlist ${setlistId}`);
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

/**
 * Save a show to the database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show data provided");
      return null;
    }
    
    console.log(`Saving show ${show.id} to database with data:`, JSON.stringify(show));
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing show:", checkError);
      return null;
    }
    
    // Make sure required fields are present
    const showData = {
      id: show.id,
      name: show.name || `Show ${show.id}`,
      date: show.date || null,
      artist_id: show.artist_id || null,
      venue_id: show.venue_id || null,
      ticket_url: show.ticket_url || null,
      image_url: show.image_url || null,
      popularity: show.popularity || 0,
      genre_ids: Array.isArray(show.genre_ids) ? show.genre_ids : [],
      updated_at: new Date().toISOString()
    };
    
    let result = null;
    
    // Update or insert show
    if (existingShow) {
      console.log(`Updating existing show ${show.id}`);
      
      const { data, error: updateError } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', show.id)
        .select('id')
        .single();
      
      if (updateError) {
        console.error("Error updating show:", updateError);
        return null;
      }
      
      console.log(`Successfully updated show ${show.id}`);
      result = data.id;
    } else {
      console.log(`Inserting new show ${show.id}`);
      
      const { data, error: insertError } = await supabase
        .from('shows')
        .insert({
          ...showData,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error("Error inserting show:", insertError);
        console.error("Show data:", showData);
        return null;
      }
      
      console.log(`Successfully inserted new show ${show.id}`);
      result = data.id;
    }
    
    // After successfully saving the show, create a setlist for it if it doesn't exist
    if (result) {
      await createSetlistForShow(show);
    }
    
    return result;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    console.error("Show data:", show);
    return null;
  }
}
