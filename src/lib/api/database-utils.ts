import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client with the service role key for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

// Artist operations
export async function getArtist(id: string) {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createArtist(artistData: any) {
  const { data, error } = await supabase
    .from('artists')
    .insert(artistData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateArtist(id: string, artistData: any) {
  const { data, error } = await supabase
    .from('artists')
    .update(artistData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function saveArtistToDatabase(artistData: any) {
  const { data, error } = await supabase
    .from('artists')
    .upsert(artistData, {
      onConflict: 'ticketmaster_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving artist to database:', error);
    throw error;
  }
  
  return data;
}

// Venue operations
export async function getVenue(id: string) {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createVenue(venueData: any) {
  const { data, error } = await supabase
    .from('venues')
    .insert(venueData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateVenue(id: string, venueData: any) {
  const { data, error } = await supabase
    .from('venues')
    .update(venueData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function saveVenueToDatabase(venueData: any) {
  const { data, error } = await supabase
    .from('venues')
    .upsert(venueData, {
      onConflict: 'ticketmaster_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving venue to database:', error);
    throw error;
  }
  
  return data;
}

// Show operations
export async function getShow(id: string) {
  const { data, error } = await supabase
    .from('shows')
    .select('*, artist:artists(*), venue:venues(*)')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createShow(showData: any) {
  const { data, error } = await supabase
    .from('shows')
    .insert(showData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateShow(id: string, showData: any) {
  const { data, error } = await supabase
    .from('shows')
    .update(showData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function saveShowToDatabase(showData: any) {
  const { data, error } = await supabase
    .from('shows')
    .upsert(showData, {
      onConflict: 'ticketmaster_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving show to database:', error);
    throw error;
  }
  
  return data;
}

// Setlist operations
export async function getSetlist(id: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select('*, show:shows(*), artist:artists(*)')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createSetlist(setlistData: any) {
  const { data, error } = await supabase
    .from('setlists')
    .insert(setlistData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSetlist(id: string, setlistData: any) {
  const { data, error } = await supabase
    .from('setlists')
    .update(setlistData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function saveSetlistToDatabase(setlistData: any) {
  const { data, error } = await supabase
    .from('setlists')
    .upsert(setlistData, {
      onConflict: 'setlist_fm_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving setlist to database:', error);
    throw error;
  }
  
  return data;
}

// Setlist songs operations
export async function getSetlistSongs(setlistId: string) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .select('*, song:songs(*)')
    .eq('setlist_id', setlistId)
    .order('position');
  
  if (error) throw error;
  return data;
}

export async function addSongToSetlist(setlistId: string, songData: any) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .insert({
      setlist_id: setlistId,
      ...songData
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSetlistSong(id: string, songData: any) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .update(songData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSetlistSong(id: string) {
  const { error } = await supabase
    .from('setlist_songs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

export async function saveSetlistSongToDatabase(setlistSongData: any) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .insert(setlistSongData)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving setlist song to database:', error);
    throw error;
  }
  
  return data;
}

// Song operations
export async function saveSongToDatabase(songData: any) {
  const { data, error } = await supabase
    .from('songs')
    .upsert(songData, {
      onConflict: 'spotify_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving song to database:', error);
    throw error;
  }
  
  return data;
}

// Vote operations
export async function getVotes(songId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('song_id', songId);
  
  if (error) throw error;
  return data;
}

export async function addVote(songId: string, userId: string) {
  // Use the function that was created in the database
  const { data, error } = await supabase.rpc('increment_vote', {
    p_song_id: songId,
    p_user_id: userId
  });
  
  if (error) throw error;
  return data;
}

export async function removeVote(songId: string, userId: string) {
  // Use the function that was created in the database
  const { data, error } = await supabase.rpc('decrement_vote', {
    p_song_id: songId,
    p_user_id: userId
  });
  
  if (error) throw error;
  return data;
}

// Generic error logging
export async function logError(endpoint: string, error: any) {
  try {
    await supabase
      .from('error_logs')
      .insert({
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
} 