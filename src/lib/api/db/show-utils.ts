import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Create a new show record in the database
export async function createShow(showData) {
  try {
    // Try with regular client first
    const { data: show, error } = await supabase
      .from('shows')
      .insert(showData)
      .select()
      .single();
      
    // If we get an authentication error and admin client is available, try with admin client
    if (error && (error.code === '401' || error.message?.includes('unauthorized')) && supabaseAdmin) {
      console.log('Using admin client for show creation due to auth error');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('shows')
        .insert(showData)
        .select()
        .single();
        
      if (!adminError && adminData) {
        console.log(`Created new show with admin client: ${adminData.id}`);
        return adminData;
      }
      
      if (adminError) {
        console.error('Error creating show with admin client:', adminError);
      }
    }
      
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
export async function createSetlistForShow(showData: { id: string; artist_id?: string }) {
  try {
    if (!showData || !showData.id) {
      console.error('Invalid show data for setlist creation:', showData);
      return null;
    }
    
    const showId = showData.id;
    console.log(`Creating setlist for show ${showId}`);
    
    // First check if a setlist already exists for this show
    const { data: existingSetlist, error: fetchError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking for existing setlist:', fetchError.message);
      // Continue anyway - we'll try to create a new one
    }
    
    // If a setlist exists, return its ID
    if (existingSetlist?.id) {
      console.log(`Setlist already exists for show ${showId}, ID: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // If we're here, we need to create a new setlist
    // We'll create it directly instead of using an RPC
    try {
      // Create a complete setlist object with all required fields
      const timestamp = new Date().toISOString();
      const setlistData = {
        show_id: showId,
        created_at: timestamp,
        last_updated: timestamp
      };
      
      console.log(`Attempting to create setlist with data:`, setlistData);
      
      // Try with regular client first
      const { data: newSetlist, error: insertError } = await supabase
        .from('setlists')
        .insert(setlistData)
        .select('id')
        .single();
      
      // If we get an authentication error and admin client is available, try with admin client
      if (insertError && (insertError.code === '401' || insertError.message?.includes('unauthorized')) && supabaseAdmin) {
        console.log('Using admin client for setlist creation due to auth error');
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('setlists')
          .insert(setlistData)
          .select('id')
          .single();
          
        if (!adminError && adminData?.id) {
          console.log(`Created new setlist with admin client: ${adminData.id}`);
          return adminData.id;
        }
        
        if (adminError) {
          console.error('Error creating setlist with admin client:', adminError);
        }
      }
      
      if (insertError) {
        // Log detailed error information
        console.error('Error creating setlist:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        
        // Check if it's a duplicate key error (someone else might have created it)
        if (insertError.code === '23505') {
          console.log(`Duplicate key error - setlist may already exist for show ${showId}`);
          
          // Try to get the setlist again
          const { data: retrySetlist } = await supabase
            .from('setlists')
            .select('id')
            .eq('show_id', showId)
            .maybeSingle();
            
          if (retrySetlist?.id) {
            console.log(`Found existing setlist on retry: ${retrySetlist.id}`);
            return retrySetlist.id;
          }
        }
        
        return null;
      }
      
      if (!newSetlist?.id) {
        console.error('No setlist ID returned after creation');
        return null;
      }
      
      console.log(`Created new setlist manually, ID: ${newSetlist.id}`);
      return newSetlist.id;
    } catch (insertError) {
      console.error('Exception during setlist creation:', insertError);
      
      // One last attempt to find an existing setlist
      try {
        const { data: lastAttemptSetlist } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
          
        if (lastAttemptSetlist?.id) {
          console.log(`Found setlist in last attempt: ${lastAttemptSetlist.id}`);
          return lastAttemptSetlist.id;
        }
      } catch (finalError) {
        console.error('Final attempt to find setlist failed:', finalError);
      }
      
      return null;
    }
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
    
    // Try with regular client first
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert(songsToInsert)
      .select();
    
    // If we get an authentication error and admin client is available, try with admin client
    if (error && (error.code === '401' || error.message?.includes('unauthorized')) && supabaseAdmin) {
      console.log('Using admin client for adding songs due to auth error');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('setlist_songs')
        .insert(songsToInsert)
        .select();
        
      if (!adminError && adminData) {
        console.log(`Successfully added ${adminData.length} songs to setlist with admin client`);
        return true;
      }
      
      if (adminError) {
        console.error('Error adding songs with admin client:', adminError);
      }
    }
    
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
