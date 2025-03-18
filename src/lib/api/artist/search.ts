import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    // Log the search request for debugging
    console.log(`Searching Ticketmaster for artists matching: "${query}"`);
    
    // Make sure the API key is properly used
    const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    
    // Direct API call to Ticketmaster to ensure it works
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(query)}&classificationName=music&size=${Math.min(limit * 3, 50)}&apikey=${TICKETMASTER_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status} - ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();

    if (!data?._embedded?.events) {
      console.log('No events found for query:', query);
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events for query: "${query}"`);

    // Extract unique artists from events
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      // Get artist from attractions if available
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        // Process each attraction that might be a music artist
        event._embedded.attractions.forEach((attraction: any) => {
          // Skip if we already have this artist or if it's not a music artist
          if (artistsMap.has(attraction.id)) return;
          
          // Check if attraction is a music artist via classifications
          let isMusicArtist = false;
          
          if (attraction.classifications) {
            isMusicArtist = attraction.classifications.some((c: any) => 
              c.segment?.name === 'Music' || 
              c.type?.name === 'Artist'
            );
          }
          
          if (!isMusicArtist) return;
          
          // Get image - prefer 16_9 ratio, but fall back to any image
          const artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || 
                            attraction.images?.[0]?.url;
          
          // Estimate popularity based on upcoming events if available
          let popularity = 0;
          if (attraction.upcomingEvents && attraction.upcomingEvents._total) {
            popularity = parseInt(attraction.upcomingEvents._total) || 0;
          }
          
          // Store artist in our map with consistent property names
          artistsMap.set(attraction.id, {
            id: attraction.id,
            name: attraction.name,
            image: artistImage,
            image_url: artistImage, // Add for consistency
            upcomingShows: attraction.upcomingEvents?._total || 1,
            upcoming_shows: attraction.upcomingEvents?._total || 1, // Add for consistency
            popularity: popularity
          });
        });
      } else {
        // Fallback to extracting from event name if no attractions
        // This is less reliable, but should help when API doesn't have attraction data
        const artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        if (!artistName) return;
        
        const artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
        
        // Only add if we don't already have this artist
        if (!artistsMap.has(artistId)) {
          const artistImage = event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || 
                            event.images?.[0]?.url;
          
          artistsMap.set(artistId, {
            id: artistId,
            name: artistName,
            image: artistImage,
            image_url: artistImage, // Add for consistency
            upcomingShows: 1,
            upcoming_shows: 1, // Add for consistency
            popularity: 0
          });
        } else {
          // Increment upcoming shows count for this artist
          const artist = artistsMap.get(artistId);
          artist.upcomingShows += 1;
          artist.upcoming_shows += 1; // Update both for consistency
          artistsMap.set(artistId, artist);
        }
      }
    });
    
    // Extract artists from the map
    const artists = Array.from(artistsMap.values());
    console.log(`Extracted ${artists.length} unique artists from events`);
    
    // Sort by estimated popularity and limit results
    return artists
      .sort((a, b) => {
        // First sort by exact name match
        const aExactMatch = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
        const bExactMatch = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
        
        if (aExactMatch !== bExactMatch) {
          return bExactMatch - aExactMatch;
        }
        
        // Then sort by popularity or upcoming shows
        return (b.popularity || b.upcomingShows) - (a.popularity || a.upcomingShows);
      })
      .slice(0, limit);
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    // Return empty array instead of letting the error propagate
    return [];
  }
}
