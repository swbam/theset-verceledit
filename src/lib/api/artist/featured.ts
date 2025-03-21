import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database";

/**
 * Fetch featured artists with upcoming shows
 */
export async function fetchFeaturedArtists(limit = 4): Promise<any[]> {
  try {
    // First, check if we have artists in the database
    const { data: dbArtists, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(limit);
    
    if (dbError) {
      console.error("Error fetching artists from database:", dbError);
    }
    
    // If we have enough artists in database, use them
    if (dbArtists && dbArtists.length >= limit) {
      return dbArtists;
    }
    
    // Otherwise, fetch from Ticketmaster
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
    
    // Get the most popular artists
    const artists = Array.from(artistsMap.values())
      .sort((a, b) => b.popularity - a.popularity || b.upcoming_shows - a.upcoming_shows)
      .slice(0, limit);
    
    // Save artists to database
    for (const artist of artists) {
      await saveArtistToDatabase(artist);
    }
    
    return artists;
  } catch (error) {
    console.error("Ticketmaster featured artists error:", error);
    return [];
  }
}
