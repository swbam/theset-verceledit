
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    const data = await callTicketmasterApi('events.json', {
      keyword: query,
      segmentName: 'Music',
      sort: 'relevance,date,asc',
      size: Math.min(limit * 2, 50).toString() // Fetch more to get unique artists
    });

    if (!data._embedded?.events) {
      return [];
    }

    // Extract unique artists from events
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      let artistId = '';
      let artistImage = '';
      let popularity = 0;
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        
        // Only process music artists or attractions with musicArtist category
        if (attraction.classifications && 
            attraction.classifications.some((c: any) => 
              c.segment?.name === 'Music' || 
              c.type?.name === 'Artist')) {
          
          artistName = attraction.name;
          artistId = attraction.id;
          artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
          
          // Estimate popularity based on ranking if available
          if (attraction.upcomingEvents && attraction.upcomingEvents._total) {
            popularity = parseInt(attraction.upcomingEvents._total) || 0;
          }
        }
      } else {
        // Fallback to extracting from event name if no attractions
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
        artistImage = event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
      }
      
      if (artistName && artistId && !artistsMap.has(artistId)) {
        artistsMap.set(artistId, {
          id: artistId,
          name: artistName,
          image: artistImage,
          upcomingShows: 1,
          popularity: popularity
        });
      } else if (artistId && artistsMap.has(artistId)) {
        // Increment upcoming shows count for this artist
        const artist = artistsMap.get(artistId);
        artist.upcomingShows += 1;
        artistsMap.set(artistId, artist);
      }
    });
    
    // Save artists to database
    const artists = Array.from(artistsMap.values());
    for (const artist of artists) {
      await saveArtistToDatabase(artist);
    }
    
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
    toast.error("Failed to search for artists");
    return [];
  }
}
