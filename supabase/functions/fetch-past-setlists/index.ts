import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SETLISTFM_API_KEY = Deno.env.get("SETLISTFM_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistName, artistId, mbid } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Function to query setlist.fm API
    async function fetchSetlistsFromApi(searchParam: string, searchValue: string) {
      console.log(`Fetching setlists for ${searchParam}=${searchValue}`);
      
      // Check if API key is available
      if (!SETLISTFM_API_KEY) {
        throw new Error("Setlist.fm API key is not configured");
      }
      
      const response = await fetch(
        `https://api.setlist.fm/rest/1.0/search/setlists?${searchParam}=${encodeURIComponent(searchValue)}&p=1`,
        {
          headers: {
            "x-api-key": SETLISTFM_API_KEY,
            "Accept": "application/json"
          }
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Setlist.fm API error: ${response.status}`, error);
        throw new Error(`Setlist.fm API error: ${response.status}`);
      }
      
      return await response.json();
    }
    
    // Check required parameters
    if (!artistName) {
      throw new Error("artistName is required");
    }
    
    // First try to fetch setlists for this artist
    let setlistsData;
    
    try {
      if (mbid) {
        // If we have a MusicBrainz ID, use that for the most reliable results
        setlistsData = await fetchSetlistsFromApi("artistMbid", mbid);
      } else {
        // Otherwise search by artist name
        setlistsData = await fetchSetlistsFromApi("artistName", artistName);
      }
    } catch (error) {
      console.error("Error fetching from Setlist.fm:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!setlistsData.setlist || setlistsData.setlist.length === 0) {
      return new Response(
        JSON.stringify({ setlists: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process and store setlists
    const processedSetlists = [];
    
    for (const setlist of setlistsData.setlist.slice(0, 5)) { // Limit to 5 most recent
      // Check if this setlist is already in our database
      const { data: existingSetlist } = await supabase
        .from("setlists")
        .select(`
          id,
          show:shows (
            id,
            name,
            date,
            venue:venues (
              name,
              city,
              state
            )
          ),
          songs:played_setlist_songs (
            id,
            position,
            is_encore,
            info,
            song:songs (
              id,
              name
            )
          )
        `)
        .eq("setlist_id", setlist.id)
        .maybeSingle();
      
      if (existingSetlist) {
        processedSetlists.push(existingSetlist);
        continue;
      }
      
      // Extract songs from the setlist
      const songs = [];
      if (setlist.sets?.set) {
        let position = 1;
        for (const set of setlist.sets.set) {
          const isEncore = set.encore || false;
          for (const song of (set.song || [])) {
            songs.push({
              name: song.name,
              position: position++,
              is_encore: isEncore,
              info: song.info || null
            });
          }
        }
      }

      // Create show record first
      const { data: show, error: showError } = await supabase
        .from("shows")
        .insert({
          name: `${setlist.artist.name} at ${setlist.venue.name}`,
          date: setlist.eventDate ?
            `${setlist.eventDate.slice(6, 10)}-${setlist.eventDate.slice(3, 5)}-${setlist.eventDate.slice(0, 2)}` :
            null,
          artist_id: artistId,
          venue_name: setlist.venue.name,
          city: setlist.venue.city.name,
          country: setlist.venue.city.country.name
        })
        .select()
        .single();

      if (showError) {
        console.error("Error creating show:", showError);
        continue;
      }

      // Create setlist record
      const { data: insertedSetlist, error } = await supabase
        .from("setlists")
        .insert({
          setlist_id: setlist.id,
          artist_id: artistId,
          show_id: show.id
        })
        .select(`
          id,
          show:shows (
            id,
            name,
            date,
            venue:venues (
              name,
              city,
              state
            )
          )
        `)
        .single();
      
      if (error) {
        console.error("Error storing setlist:", error);
      } else if (insertedSetlist) {
        processedSetlist.dbId = insertedSetlist.id;
        processedSetlists.push(processedSetlist);
      }
    }
    
    return new Response(
      JSON.stringify({ setlists: processedSetlists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message, setlists: [] }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
