
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";
import { fetchAndStoreArtistTracks } from "../database";
import { getArtistByName } from "@/lib/spotify";
import { supabase } from "@/integrations/supabase/client";
import { ErrorSource, handleError } from "@/lib/error-handling";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    console.log(`Searching for artists with query: "${query}"`);
    
    // First check if we already have this artist in our database
    try {
      const { data: existingArtists, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);
        
      if (dbError) {
        console.error("Error searching database for artists:", dbError);
        console.error("Detailed error info:", JSON.stringify(dbError));
        // Continue with Ticketmaster search even if DB search fails
      } else if (existingArtists && existingArtists.length > 0) {
        console.log(`Found ${existingArtists.length} artists in database matching '${query}'`);
        
        // Return the existing artists but still do the API call in the background to refresh data
        // Don't await this so we return results quickly
        callTicketmasterApi('events.json', {
          keyword: query,
          segmentName: 'Music',
          sort: 'date,asc',
          size: limit.toString()
        }).then(data => {
          if (data._embedded?.events) {
            processAndSaveTicketmasterArtists(data, limit);
          }
        }).catch(err => {
          console.error("Background Ticketmaster refresh error:", err);
        });
        
        return existingArtists;
      }
    } catch (dbSearchError) {
      console.error("Database search error:", dbSearchError);
      // Continue with API search if DB search fails
    }
    
    // If not found in DB or we want fresh data, search Ticketmaster
    console.log(`Searching Ticketmaster for artists matching '${query}'`);
    const data = await callTicketmasterApi('events.json', {
      keyword: query,
      segmentName: 'Music',
      sort: 'date,asc',
      size: limit.toString()
    });

    if (!data._embedded?.events) {
      console.log(`No events found on Ticketmaster for query '${query}'`);
      return [];
    }

    // Process and save the artists
    const artists = await processAndSaveTicketmasterArtists(data, limit);
    console.log("Processed and returning artists:", artists.length);
    return artists;
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    handleError({
      message: "Failed to search for artists",
      source: ErrorSource.API,
      originalError: error
    });
    return [];
  }
}

/**
 * Helper function to process and save artists from Ticketmaster response
 */
async function processAndSaveTicketmasterArtists(data: any, limit: number): Promise<any[]> {
  console.log(`Processing ${data._embedded.events.length} events from Ticketmaster`);
  
  // Extract unique artists from events
  const artistsMap = new Map();
  
  data._embedded.events.forEach((event: any) => {
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    let artistImage = '';
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
    } else {
      // Fallback to extracting from event name if no attractions
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      artistImage = event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
    }
    
    if (!artistsMap.has(artistId)) {
      artistsMap.set(artistId, {
        id: artistId,
        name: artistName,
        image: artistImage,
        upcomingShows: 1
      });
    } else {
      // Increment upcoming shows count for this artist
      const artist = artistsMap.get(artistId);
      artist.upcomingShows += 1;
      artistsMap.set(artistId, artist);
    }
  });
  
  // Process artists - even if DB operations fail, return the artists from API
  const artists = Array.from(artistsMap.values());
  console.log(`Found ${artists.length} unique artists from events`);
  
  // Try to save to DB but don't block returning results if it fails
  try {
    for (const artist of artists) {
      try {
        console.log(`Processing artist: ${artist.name} (ID: ${artist.id})`);
        
        // Try to fetch Spotify data for this artist
        try {
          const spotifyArtist = await getArtistByName(artist.name);
          if (spotifyArtist && spotifyArtist.id) {
            console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artist.name}`);
            artist.spotify_id = spotifyArtist.id;
            artist.spotify_url = spotifyArtist.external_urls?.spotify;
          } else {
            console.log(`No Spotify artist found for ${artist.name}`);
          }
        } catch (spotifyError) {
          console.error(`Error fetching Spotify details for ${artist.name}:`, spotifyError);
        }
        
        // Save to database (with or without Spotify data)
        saveArtistToDatabase(artist).catch(saveError => {
          console.error(`Error saving artist ${artist.name} to database:`, saveError);
        });
      } catch (artistError) {
        console.error(`Error processing artist ${artist.name}:`, artistError);
        // Continue with next artist
      }
    }
  } catch (processingError) {
    console.error("Error processing artists:", processingError);
    // Even if DB operations fail, we still return the artists from the API
  }
  
  return artists;
}
