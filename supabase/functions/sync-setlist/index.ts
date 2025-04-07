/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncSetlistPayload {
  setlistId: string; // The setlist.fm ID
  // Add other options if needed, e.g., force sync
  // force?: boolean;
}

// Define the structure for a song within the setlist
// Align with how you store songs in the 'songs' JSONB column of 'setlists' table
interface SetlistSong {
  id?: string; // Consider if you need a unique ID per song instance
  name: string;
  artist_mbid?: string | null; // MusicBrainz ID from setlist.fm artist
  encore?: number; // 0 or 1
  position?: number;
  // Add other fields like 'cover', 'tape', 'info' if needed
}

// Define the structure returned by the fetch function
interface FetchedSetlistData {
  setlistId: string;
  artistMbid?: string | null;
  showId?: string | null; // UUID of the show in your DB
  songs: SetlistSong[];
  // Add venue, tour etc. if needed from setlist.fm data
}

// Define the structure for the 'setlists' table row
interface SetlistTableRow {
  id: string; // setlist.fm ID is the primary key
  artist_id?: string | null; // UUID of the artist in your DB (might need lookup)
  artist_mbid?: string | null; // Store MBID for reference
  show_id?: string | null; // UUID of the show in your DB
  songs: SetlistSong[];
  created_at?: string;
  updated_at?: string;
}


/**
 * Fetch setlist data from setlist.fm and find related show
 */
async function fetchAndTransformSetlistData(supabaseAdmin: any, setlistId: string): Promise<FetchedSetlistData | null> {
  console.log(`Fetching data for setlist ${setlistId}`);

  const apiKey = Deno.env.get('SETLIST_FM_API_KEY');
  if (!apiKey) {
    console.error('SETLIST_FM_API_KEY not set.');
    return null;
  }

  try {
    const apiUrl = `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`;
    console.log(`Fetching from setlist.fm: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Setlist.fm API error for ${setlistId}: ${response.status} ${await response.text()}`);
      return null;
    }

    const sfmData = await response.json(); // sfmData = setlist.fm data
    console.log(`Received setlist.fm data for ${setlistId}`);

    // --- Parse Songs ---
    const songs: SetlistSong[] = [];
    let songPositionCounter = 0;
    if (sfmData.sets?.set) {
      sfmData.sets.set.forEach((set: any) => {
        const isEncore = set.encore ? 1 : 0;
        if (set.song) {
          set.song.forEach((song: any) => {
            if (song.name) {
              songPositionCounter++;
              songs.push({
                // Generate a simple position-based ID or use song MBID if available
                // id: `${setlistId}-${songPositionCounter}`,
                name: song.name,
                artist_mbid: sfmData.artist?.mbid || null, // Artist MBID for context
                encore: isEncore,
                position: songPositionCounter,
                // Add other fields like cover status, tape status, info if needed
                // info: song.info,
                // tape: song.tape,
                // cover: song.cover ? { mbid: song.cover.mbid, name: song.cover.name, url: song.cover.url } : undefined
              });
            }
          });
        }
      });
    }

    // --- Find Matching Show in DB ---
    let showId: string | null = null;
    const artistMbid = sfmData.artist?.mbid;
    const eventDateStr = sfmData.eventDate; // Format: DD-MM-YYYY

    if (artistMbid && eventDateStr) {
      // Parse date carefully
      const dateParts = eventDateStr.split('-');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(dateParts[2]);

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const eventDate = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues

          // Find artist UUID using MBID
          const { data: artistData, error: artistError } = await supabaseAdmin
            .from('artists')
            .select('id') // Select the UUID primary key
            .eq('mbid', artistMbid) // Assuming you have an 'mbid' column on artists table
            .maybeSingle();

          if (artistError) {
             console.warn(`Error fetching artist by MBID ${artistMbid}: ${artistError.message}`);
          }

          if (artistData?.id) {
            const artistUUID = artistData.id;
            console.log(`Found artist UUID ${artistUUID} for MBID ${artistMbid}`);

            // Search for shows matching artist UUID and date range
            const startDate = new Date(eventDate);
            startDate.setUTCHours(0, 0, 0, 0);
            const endDate = new Date(eventDate);
            endDate.setUTCHours(23, 59, 59, 999);

            console.log(`Searching for show with artist_id ${artistUUID} between ${startDate.toISOString()} and ${endDate.toISOString()}`);

            const { data: shows, error: showsError } = await supabaseAdmin
              .from('shows')
              .select('id') // Select the show UUID
              .eq('artist_id', artistUUID)
              .gte('date', startDate.toISOString())
              .lte('date', endDate.toISOString()) // Use lte for end of day
              .limit(1); // Assume only one show per artist per day

            if (showsError) {
              console.warn(`Error searching for show for artist ${artistUUID} on ${eventDateStr}: ${showsError.message}`);
            }

            if (shows && shows.length > 0) {
              showId = shows[0].id;
              console.log(`Found matching show ID: ${showId}`);
            } else {
              console.log(`No matching show found for artist ${artistUUID} on ${eventDateStr}`);
            }
          } else {
             console.log(`Artist with MBID ${artistMbid} not found in DB.`);
          }
        } else {
           console.warn(`Invalid date format from setlist.fm: ${eventDateStr}`);
        }
      } else {
         console.log(`Missing artist MBID (${artistMbid}) or event date (${eventDateStr}) in setlist.fm data.`);
      }
    }

    return {
      setlistId: setlistId,
      artistMbid: artistMbid || null,
      showId: showId,
      songs: songs,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching or processing setlist ${setlistId}:`, errorMsg);
    return null;
  }
}


serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncSetlistPayload = await req.json();
    const { setlistId } = payload;

    if (!setlistId) {
      return new Response(JSON.stringify({ error: 'Missing setlistId in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Sync request received for setlist: ${setlistId}`);

    // Initialize Supabase client with SERVICE_ROLE key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch and transform data
    const fetchedData = await fetchAndTransformSetlistData(supabaseAdmin, setlistId);

    if (!fetchedData) {
      console.error(`Failed to fetch or transform data for setlist ${setlistId}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch setlist data from external API or process it' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Prepare data for setlists table upsert
    // Need to look up artist UUID again if not already done or passed back
    let artistUUID: string | null = null;
    if (fetchedData.artistMbid) {
       const { data: artistLookup } = await supabaseAdmin
         .from('artists')
         .select('id')
         .eq('mbid', fetchedData.artistMbid)
         .maybeSingle();
       artistUUID = artistLookup?.id || null;
    }

    const setlistRow: SetlistTableRow = {
      id: fetchedData.setlistId, // Use setlist.fm ID as PK
      artist_id: artistUUID,
      artist_mbid: fetchedData.artistMbid,
      show_id: fetchedData.showId,
      songs: fetchedData.songs,
      // created_at handled by DB default or trigger? Assuming update below is sufficient
      updated_at: new Date().toISOString(),
    };

    // Upsert data into setlists table
    console.log(`Upserting setlist ${setlistId} into database...`);
    const { data: upsertedSetlist, error: upsertError } = await supabaseAdmin
      .from('setlists')
      .upsert(setlistRow, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.error(`Supabase setlist upsert error for ${setlistId}:`, upsertError);
      return new Response(JSON.stringify({ error: 'Database error during setlist upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    console.log(`Successfully upserted setlist ${setlistId}`);

    // Update the corresponding show record if a showId was found
    if (fetchedData.showId) {
      console.log(`Updating show ${fetchedData.showId} to link setlist ${setlistId}`);
      const { error: updateShowError } = await supabaseAdmin
        .from('shows')
        .update({ setlist_id: fetchedData.setlistId })
        .eq('id', fetchedData.showId);

      if (updateShowError) {
        // Log error but don't fail the whole function, setlist was saved
        console.error(`Error updating show ${fetchedData.showId} with setlist_id ${setlistId}:`, updateShowError.message);
      } else {
         console.log(`Successfully linked setlist ${setlistId} to show ${fetchedData.showId}`);
      }
    }

    // TODO: Optionally trigger sync for related songs if needed

    return new Response(JSON.stringify({ success: true, data: upsertedSetlist }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})