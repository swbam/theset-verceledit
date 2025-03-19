
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase, fetchAndStoreArtistTracks } from "../database";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";
import { supabase } from "@/integrations/supabase/client";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    console.log(`Searching for artists with query: "${query}"`);
    
    // First check if we already have this artist in our database
    const { data: existingArtists, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);
      
    if (dbError) {
      console.error("Error searching database for artists:", dbError);
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
    return await processAndSaveTicketmasterArtists(data, limit);
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    toast.error("Failed to search for artists");
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
  
  // Process artists - save to database and fetch Spotify data
  const artists = Array.from(artistsMap.values());
  const enrichedArtists = [];
  
  console.log(`Found ${artists.length} unique artists from events`);
  
  for (const artist of artists) {
    console.log(`Processing artist: ${artist.name} (ID: ${artist.id})`);
    
    // Try to fetch Spotify data for this artist
    try {
      const spotifyArtist = await getArtistByName(artist.name);
      if (spotifyArtist && spotifyArtist.id) {
        console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artist.name}`);
        artist.spotify_id = spotifyArtist.id;
        artist.spotify_url = spotifyArtist.external_urls?.spotify;
        
        // Instead of fetching tracks here, we'll save the artist with Spotify ID,
        // and let the background process handle track fetching
      } else {
        console.log(`No Spotify artist found for ${artist.name}`);
      }
    } catch (spotifyError) {
      console.error(`Error fetching Spotify details for ${artist.name}:`, spotifyError);
    }
    
    // Save to database (with or without Spotify data)
    const savedArtist = await saveArtistToDatabase(artist);
    
    // If we have a Spotify ID but no tracks, initiate background track fetch
    if (artist.spotify_id && savedArtist && !savedArtist.stored_tracks) {
      // Don't await - let this run in background
      fetchAndStoreArtistTracks(artist.id, artist.spotify_id, artist.name)
        .catch(err => console.error(`Background track fetch error for ${artist.name}:`, err));
    }
    
    if (savedArtist) {
      enrichedArtists.push(savedArtist);
    } else {
      enrichedArtists.push(artist);
    }
  }
  
  return enrichedArtists;
}
