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
    
    const data = await callTicketmasterApi('events.json', {
      keyword: query,
      segmentName: 'Music',
      sort: 'relevance,date,asc',
      size: Math.min(limit * 3, 50).toString() // Fetch more to get a good selection of unique artists
    });

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
          
          // Store artist in our map
          artistsMap.set(attraction.id, {
            id: attraction.id,
            name: attraction.name,
            image: artistImage,
            upcomingShows: attraction.upcomingEvents?._total || 1,
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
            upcomingShows: 1,
            popularity: 0
          });
        } else {
          // Increment upcoming shows count for this artist
          const artist = artistsMap.get(artistId);
          artist.upcomingShows += 1;
          artistsMap.set(artistId, artist);
        }
      }
    });
    
    // Extract artists from the map
    const artists = Array.from(artistsMap.values());
    console.log(`Extracted ${artists.length} unique artists from events`);
    
    // Don't attempt to save to database during search - this is likely causing the error
    // We'll only do this when the user explicitly selects an artist
    
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
    // Don't show toast during search as it's distracting
    // toast.error("Failed to search for artists");
    
    // Return empty array instead of letting the error propagate
    return [];
  }
}
