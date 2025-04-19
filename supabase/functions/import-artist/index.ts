import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming standard CORS headers file
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { saveArtistToDatabase, saveShowToDatabase } from '../_shared/databaseUtils.ts';
import { getArtistByName } from '../_shared/spotifyUtils.ts';
import type { Artist, Show, SpotifyArtist, Venue } from '../_shared/types.ts';

// Define Ticketmaster API types to match their response structure
interface TicketmasterVenue {
  id: string;
  name: string;
  url?: string;
  city?: { name: string };
  state?: { name: string };
  country?: { name: string };
  address?: { line1: string };
  postalCode?: string;
  location?: { latitude?: number; longitude?: number };
  images?: Array<{ url: string; width?: number; height?: number }>;
}

interface TicketmasterShow {
  id: string;
  name: string;
  url?: string;
  dates?: any;
  venue?: TicketmasterVenue;
  images?: Array<{ url: string; width?: number; height?: number }>;
}

console.log('Import Artist function initializing...');

// Add utility functions at the top
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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let inputData: { id: string, name: string, [key: string]: any };
    try {
      inputData = await req.json();
    } catch (e) {
      console.error('[import-artist] Error parsing request body:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-artist] Received request for artist: ${inputData?.name} (TM ID: ${inputData?.id})`);

    // Validate incoming artist data
    if (!inputData || !inputData.id || !inputData.name) {
      console.error('[import-artist] Invalid artist data provided:', inputData);
      return new Response(JSON.stringify({ error: 'Invalid artist data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Main Import Logic ---

    // Prepare artist data with proper ticketmaster_id
    const artistData: Partial<Artist> = {
      name: inputData.name,
      ticketmaster_id: inputData.id,
      spotify_id: inputData.spotify_id,
      image_url: inputData.image_url,
      url: inputData.url,
      genres: inputData.genres,
      popularity: inputData.popularity,
      followers: inputData.followers,
      updated_at: new Date().toISOString()
    };

    console.log(`[import-artist] Prepared artist data:`, JSON.stringify(artistData));

    // 1. Save/Update Artist in DB
    // This now returns the artist record *from the database*
    let dbArtist = await saveArtistToDatabase(artistData);
    if (!dbArtist?.id) { // Check for the DB ID specifically
      // saveArtistToDatabase should throw on failure, but double-check
      console.error(`[import-artist] Failed to save artist: ${artistData.name}`);
      throw new Error(`Failed to save artist ${artistData.name} to database.`);
    }
    console.log(`[import-artist] Artist ${dbArtist.name} saved/found in DB with ID: ${dbArtist.id}, TM ID: ${dbArtist.ticketmaster_id}`);

    // 2. Enrich with Spotify Data (if needed)
    if (!dbArtist.spotify_id) {
      console.log(`[import-artist] Attempting to find Spotify ID for ${dbArtist.name}`);
      const spotifyArtistResult: SpotifyArtist | null = await getArtistByName(dbArtist.name);
      if (spotifyArtistResult?.id) {
        console.log(`[import-artist] Found Spotify ID: ${spotifyArtistResult.id}. Updating DB.`);
        const { error: spotifyUpdateError } = await supabaseAdmin
          .from('artists')
          .update({
            spotify_id: spotifyArtistResult.id,
            spotify_url: spotifyArtistResult.external_urls?.spotify,
            popularity: spotifyArtistResult.popularity,
            followers: spotifyArtistResult.followers?.total,
            // genres: spotifyArtistResult.genres, // Uncomment if you want to store genres
            updated_at: new Date().toISOString()
          })
          .eq('id', dbArtist.id); // Match using the DB ID

        if (spotifyUpdateError) {
           console.error(`[import-artist] Error updating artist ${dbArtist.name} with Spotify ID:`, spotifyUpdateError);
           // Log error but continue - enrichment isn't critical path
        } else {
           // Update the local object for the response
           dbArtist = { ...dbArtist, spotify_id: spotifyArtistResult.id };
           console.log(`[import-artist] Successfully updated artist ${dbArtist.name} with Spotify ID.`);
        }
      } else {
         console.log(`[import-artist] Spotify ID not found for ${dbArtist.name}.`);
      }
    }

    // 3. Fetch Artist Events from Ticketmaster (using TM ID)
    // fetchArtistEvents expects the Ticketmaster ID
    const ticketmasterId = dbArtist.ticketmaster_id || inputData.id;
    console.log(`[import-artist] Fetching Ticketmaster events for artist TM ID: ${ticketmasterId}`);

    // Fetch artist events with retry
    console.log(`[import-artist] Fetching Ticketmaster events for artist TM ID: ${ticketmasterId}`);
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    const shows = await fetchWithRetry(
      `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${ticketmasterId}&segmentName=Music&sort=date,asc&size=100&apikey=${apiKey}`,
      {}
    );

    // Process the response to extract the events array
    const events = shows?._embedded?.events || [];

    if (!events || events.length === 0) {
      console.log(`[import-artist] Artist ${dbArtist.name} saved, no upcoming shows found via Ticketmaster.`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Artist saved/updated, no upcoming shows found.',
        artist: dbArtist // Return the DB artist record
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[import-artist] Found ${events.length} shows for artist ${dbArtist.name}.`);

    // 4. Process and Save Shows (and their venues, setlists)
    let savedCount = 0;
    let failedCount = 0;
    const errorMessages: string[] = []; // Collect error messages for debugging
    
    const showProcessingPromises = events.map(async (show: TicketmasterShow) => {
      try {
        // DETAILED DEBUG: Log the specific show being processed
        console.log(`[import-artist] Processing show: ${show.name} (ID: ${show.id})`);
        
        // Create a properly typed show object with ticketmaster_id
        const showWithTicketmasterId: Partial<Show> = {
          id: crypto.randomUUID(),
          name: show.name,
          artist_id: dbArtist.id,
          venue_id: '', // Will be set after venue is saved
          ticketmaster_id: show.id,
          date: show.dates?.start?.localDate || new Date().toISOString().split('T')[0],
          image_url: show.images?.[0]?.url,
          url: show.url,
          updated_at: new Date().toISOString(),
          // Add the database artist to each show to establish connection
          artist: { 
            id: dbArtist.id, // DB ID
            ticketmaster_id: dbArtist.ticketmaster_id || ticketmasterId,
            name: dbArtist.name 
          }
        };
        
        // Process venues as well
        if (show.venue && typeof show.venue === 'object' && show.venue.id) {
          console.log(`[import-artist] Show has venue: ${show.venue.name} (ID: ${show.venue.id})`);
          const venueData: Partial<Venue> = {
            id: crypto.randomUUID(),
            name: show.venue.name,
            city: show.venue.city?.name || '',
            state: show.venue.state?.name,
            country: show.venue.country?.name,
            address: show.venue.address?.line1,
            postal_code: show.venue.postalCode,
            latitude: show.venue.location?.latitude?.toString(),
            longitude: show.venue.location?.longitude?.toString(),
            image_url: show.venue.images?.[0]?.url,
            url: show.venue.url,
            ticketmaster_id: show.venue.id,
            updated_at: new Date().toISOString()
          };
          // Assign venue to the show as a Partial<Venue> which is compatible with the Show type
          showWithTicketmasterId.venue = venueData;
          
          // DETAILED DEBUG: Check venue structure
          console.log(`[import-artist] Prepared venue data:`, JSON.stringify(showWithTicketmasterId.venue));
        } else {
          console.warn(`[import-artist] Missing venue data for show: ${show.name}`);
        }

        // DETAILED DEBUG: Log the prepared show data before saving
        console.log(`[import-artist] Prepared show data:`, JSON.stringify(showWithTicketmasterId));

        try {
          const savedShow = await saveShowToDatabase(showWithTicketmasterId);
          if (savedShow) {
            savedCount++;
            console.log(`[import-artist] Successfully processed show ${show.name} (TM ID: ${show.id}, DB ID: ${savedShow.id})`);
          } else {
            // This case might not happen if saveShowToDatabase throws on failure
            failedCount++;
            const errMsg = `saveShowToDatabase returned null for show ${show.name} (ID: ${show.id})`;
            errorMessages.push(errMsg);
            console.warn(`[import-artist] ${errMsg}`);
          }
        } catch (dbErr) {
          failedCount++;
          const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          errorMessages.push(`DB Error: ${errMsg}`);
          console.error(`[import-artist] Database error processing show ${show.id} (${show.name}):`, errMsg);
        }
      } catch (err) {
        failedCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        errorMessages.push(errMsg);
        console.error(`[import-artist] Error processing show ${show.id} (${show.name}):`, errMsg);
      }
    });

    // Wait for all show processing attempts to complete
    await Promise.allSettled(showProcessingPromises);
    console.log(`[import-artist] Finished processing shows. Saved: ${savedCount}, Failed: ${failedCount}`);
    
    if (failedCount > 0) {
      console.error(`[import-artist] Error summary for failed shows:`, errorMessages.slice(0, 5));
    }

    // 5. Return Success Response
    return new Response(JSON.stringify({
      success: true,
      message: `Artist import process finished. Shows processed: ${events.length}, Saved/Updated: ${savedCount}, Failed: ${failedCount}.`,
      artist: dbArtist, // Return the final DB artist record
      savedShows: savedCount,
      failedShows: failedCount,
      errors: errorMessages.slice(0, 5) // Include a sample of errors for debugging
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[import-artist] Unhandled error in function:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});