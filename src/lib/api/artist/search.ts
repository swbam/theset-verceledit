
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
      sort: 'date,asc',
      size: limit.toString()
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
    
    // Save artists to database
    const artists = Array.from(artistsMap.values());
    for (const artist of artists) {
      await saveArtistToDatabase(artist);
    }
    
    return artists;
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    toast.error("Failed to search for artists");
    return [];
  }
}
