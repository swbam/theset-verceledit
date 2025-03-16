
import { toast } from "sonner";
import { callTicketmasterApi } from "./ticketmaster-config";

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
    
    return Array.from(artistsMap.values());
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    toast.error("Failed to search for artists");
    return [];
  }
}

/**
 * Fetch featured artists with upcoming shows
 */
export async function fetchFeaturedArtists(limit = 4): Promise<any[]> {
  try {
    // Increase the number of events to find the most popular artists
    const data = await callTicketmasterApi('events.json', {
      size: '100', // Fetch more events to get better data
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get more popular events
      classificationId: 'KnvZfZ7vAeA', // Default to Rock for popular artists
      includeFamily: 'no' // Filter out family events
    });

    if (!data._embedded?.events) {
      return [];
    }

    // Extract unique artists from events with popularity metrics
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        event._embedded.attractions.forEach((attraction: any) => {
          if (!artistsMap.has(attraction.id) && attraction.classifications?.[0]?.segment?.name === "Music") {
            // Prioritize high-res images
            const image = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || 
                         attraction.images?.find((img: any) => img.ratio === "1_1" && img.width > 300)?.url ||
                         attraction.images?.[0]?.url;
            
            const genres = [];
            if (attraction.classifications?.[0]?.genre?.name) {
              genres.push(attraction.classifications[0].genre.name);
            }
            if (attraction.classifications?.[0]?.subGenre?.name) {
              genres.push(attraction.classifications[0].subGenre.name);
            }
            
            // Calculate popularity score based on available metrics
            const popularityScore = (
              (event.rank || 0) + 
              (event.sales?.public?.startDateTime ? 1 : 0) + 
              (event.dates?.status?.code === "onsale" ? 3 : 0) +
              (event._embedded?.venues?.[0]?.upcomingEvents?.totalEvents || 0) / 10
            );
            
            artistsMap.set(attraction.id, {
              id: attraction.id,
              name: attraction.name,
              image: image,
              genres: genres,
              upcoming_shows: 1,
              popularity: popularityScore
            });
          } else if (artistsMap.has(attraction.id)) {
            // Update existing artist data
            const artist = artistsMap.get(attraction.id);
            artist.upcoming_shows += 1;
            
            // More shows = more popular
            artist.popularity += 2;
            
            artistsMap.set(attraction.id, artist);
          }
        });
      }
    });
    
    // Get the most popular artists based on our popularity metrics
    return Array.from(artistsMap.values())
      .sort((a, b) => b.popularity - a.popularity || b.upcoming_shows - a.upcoming_shows)
      .slice(0, limit);
  } catch (error) {
    console.error("Ticketmaster featured artists error:", error);
    toast.error("Failed to load featured artists");
    return [];
  }
}
