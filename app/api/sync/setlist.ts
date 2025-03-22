import { createClient } from '@supabase/supabase-js';
import { retryableFetch } from '@/lib/retry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches setlist data from the Setlist.fm API for a specific artist
 */
export async function fetchSetlistFmData(artistName: string) {
  const apiKey = process.env.SETLIST_FM_API_KEY;
  if (!apiKey) throw new Error('Missing Setlist.fm API key');
  
  // First search for artist
  const artistSearchResponse = await fetch(
    `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`,
    {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    }
  );
  
  if (!artistSearchResponse.ok) {
    throw new Error(`Setlist.fm Artist Search API error: ${artistSearchResponse.status}`);
  }
  
  const artistSearchData = await artistSearchResponse.json();
  
  if (!artistSearchData.artist || artistSearchData.artist.length === 0) {
    throw new Error(`Artist ${artistName} not found on Setlist.fm`);
  }
  
  const artistMbid = artistSearchData.artist[0].mbid;
  
  // Now fetch setlists for this artist
  const setlistResponse = await fetch(
    `https://api.setlist.fm/rest/1.0/artist/${artistMbid}/setlists?p=1`,
    {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      next: { revalidate: 43200 } // Cache for 12 hours
    }
  );
  
  if (!setlistResponse.ok) {
    throw new Error(`Setlist.fm Setlists API error: ${setlistResponse.status}`);
  }
  
  const data = await setlistResponse.json();
  
  // Store the MBID in artists table for future use
  await supabase
    .from('artists')
    .update({ setlist_fm_mbid: artistMbid })
    .eq('name', artistName);
  
  return {
    mbid: artistMbid,
    setlists: data.setlist || []
  };
}

/**
 * Process and store setlist data in the database
 */
export async function processSetlistData(artistId: string, setlists: any[]) {
  try {
    // Process each setlist
    for (const setlist of setlists) {
      // Create or get show
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .upsert({
          artist_id: artistId,
          date: setlist.eventDate ? new Date(`${setlist.eventDate}T20:00:00Z`).toISOString() : new Date().toISOString(),
          venue: setlist.venue?.name || 'Unknown Venue',
          city: `${setlist.venue?.city?.name || 'Unknown'}, ${setlist.venue?.city?.country?.name || 'Unknown'}`,
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'artist_id,date,venue',
          returning: 'representation'
        });
        
      if (showError) throw showError;
      
      if (!showData || !showData[0]) continue;
      
      const showId = showData[0].id;
      
      // Create setlist
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .upsert({
          show_id: showId,
          artist_id: artistId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'show_id',
          returning: 'representation'
        });
        
      if (setlistError) throw setlistError;
      
      if (!setlistData || !setlistData[0]) continue;
      
      const setlistId = setlistData[0].id;
      
      // Process songs
      if (setlist.sets?.set) {
        const songs = [];
        
        // Flatten the sets structure
        for (const set of setlist.sets.set) {
          if (set.song) {
            for (const song of set.song) {
              songs.push({
                title: song.name,
                artist_id: artistId,
                setlist_id: setlistId,
                vote_count: 0,
                last_updated: new Date().toISOString()
              });
            }
          }
        }
        
        // Batch insert songs
        if (songs.length > 0) {
          const { error: songsError } = await supabase
            .from('setlist_songs')
            .upsert(songs, { 
              onConflict: 'title,setlist_id'
            });
            
          if (songsError) throw songsError;
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing setlist data:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'setlist-sync',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return { error: 'Failed to process setlist data' };
  }
} 