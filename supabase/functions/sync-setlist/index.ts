/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncSetlistPayload {
  setlist_fm_id: string; // The setlist.fm ID
}

// Define the structure for a song within the setlist
interface SetlistSong {
  id?: string;
  name: string;
  artist_id?: string | null;
  encore?: number;
  position?: number;
}

// Define the structure returned by the fetch function
interface FetchedSetlistData {
  setlist_fm_id: string;
  artist_id?: string | null;
  show_id?: string | null;
  songs: SetlistSong[];
  venue_id?: string | null;
  tour_name?: string | null;
  date?: string | null;
}

// Define the structure for the 'setlists' table row
interface SetlistTableRow {
  id: string;
  artist_id?: string | null;
  show_id?: string | null;
  songs: SetlistSong[];
  venue_id?: string | null;
  tour_name?: string | null;
  date?: string | null;
  setlist_fm_id: string;
  created_at?: string;
  updated_at?: string;
}

// Utility functions for robust error handling and response validation
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<any> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      if (!data) throw new Error('Empty response received');
      return data;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        console.log(`Retry attempt ${i + 1}/${retries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
};

const parseRequest = async (req: Request): Promise<SyncSetlistPayload> => {
  try {
    const text = await req.text();
    if (!text) throw new Error('Empty request body');
    const data = JSON.parse(text);
    if (!data.setlist_fm_id) throw new Error('Missing setlist_fm_id in request body');
    return data;
  } catch (e) {
    throw new Error(`Invalid request: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/**
 * Fetch setlist data from setlist.fm and find related show
 */
async function fetchAndTransformSetlistData(supabaseClient: any, setlist_fm_id: string): Promise<FetchedSetlistData | null> {
  const apiKey = Deno.env.get('SETLIST_FM_API_KEY');
  if (!apiKey) {
    throw new Error('Missing SETLIST_FM_API_KEY in environment variables');
  }

  try {
    const apiUrl = `https://api.setlist.fm/rest/1.0/setlist/${setlist_fm_id}`;
    console.log(`Fetching from setlist.fm: ${apiUrl}`);
    
    const sfmData = await fetchWithRetry(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
      }
    });

    // Transform setlist data
    const songs: SetlistSong[] = sfmData.sets.set
      .flatMap((set: any) => set.song || [])
      .map((song: any, idx: number) => ({
        name: song.name,
        position: idx + 1,
        encore: song.encore || 0,
        artist_id: song.cover?.mbid
      }));

    // Try to find the artist in our database
    let artistId = null;
    if (sfmData.artist?.mbid) {
      const { data: artistData } = await supabaseClient
        .from('artists')
        .select('id')
        .eq('setlist_fm_id', sfmData.artist.mbid)
        .single();
      artistId = artistData?.id;
    }

    // Try to find or create the venue
    let venueId = null;
    if (sfmData.venue) {
      const { data: venueData } = await supabaseClient
        .from('venues')
        .select('id')
        .eq('name', sfmData.venue.name)
        .eq('city', sfmData.venue.city.name)
        .single();
      
      if (venueData) {
        venueId = venueData.id;
      } else {
        const { data: newVenue } = await supabaseClient
          .from('venues')
          .insert({
            name: sfmData.venue.name,
            city: sfmData.venue.city.name,
            state: sfmData.venue.city.state,
            country: sfmData.venue.city.country.name,
          })
          .select()
          .single();
        venueId = newVenue?.id;
      }
    }

    return {
      setlist_fm_id: setlist_fm_id,
      artist_id: artistId,
      songs,
      venue_id: venueId,
      tour_name: sfmData.tour?.name,
      date: sfmData.eventDate ? new Date(sfmData.eventDate).toISOString() : null
    };
  } catch (error) {
    console.error(`Error fetching setlist ${setlist_fm_id}:`, error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { setlist_fm_id } = await req.json() as SyncSetlistPayload;

    if (!setlist_fm_id) {
      return new Response(JSON.stringify({ error: 'Invalid request: Missing setlist_fm_id in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[sync-setlist] Processing setlist with ID: ${setlist_fm_id}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch and transform data
    const fetchedData = await fetchAndTransformSetlistData(supabaseClient, setlist_fm_id);

    if (!fetchedData) {
      console.error(`Failed to fetch or transform data for setlist ${setlist_fm_id}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch setlist data from external API or process it' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Prepare data for setlists table upsert
    const setlistRow: SetlistTableRow = {
      id: crypto.randomUUID(), // Generate a new UUID for our primary key
      setlist_fm_id: fetchedData.setlist_fm_id,
      artist_id: fetchedData.artist_id,
      show_id: fetchedData.show_id,
      venue_id: fetchedData.venue_id,
      tour_name: fetchedData.tour_name,
      date: fetchedData.date,
      songs: fetchedData.songs,
      updated_at: new Date().toISOString(),
    };

    // Upsert data into setlists table
    console.log(`Upserting setlist ${setlist_fm_id} into database...`);
    const { data: upsertedSetlist, error: upsertError } = await supabaseClient
      .from('setlists')
      .upsert(setlistRow)
      .select()
      .single();

    if (upsertError) {
      console.error(`Database error during setlist upsert:`, upsertError);
      return new Response(JSON.stringify({ error: 'Database error during setlist upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Setlist synced successfully',
      data: upsertedSetlist
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in sync-setlist function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
});