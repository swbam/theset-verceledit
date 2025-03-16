import { toast } from "sonner";
import { callTicketmasterApi } from "./ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";

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
    toast.error("Failed to load featured artists");
    return [];
  }
}

/**
 * Save artist to database
 */
async function saveArtistToDatabase(artist: any) {
  try {
    // Check if artist already exists
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('id, updated_at')
      .eq('id', artist.id)
      .maybeSingle();
    
    // If artist exists and was updated in the last 7 days, don't update
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        return;
      }
    }
    
    // Insert or update artist
    const { error } = await supabase
      .from('artists')
      .upsert({
        id: artist.id,
        name: artist.name,
        image: artist.image,
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        popularity: artist.popularity || 0,
        upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving artist to database:", error);
    }
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
  }
}

/**
 * Fetch artist details by ID
 */
export async function fetchArtistById(artistId: string): Promise<any> {
  try {
    // First try to get from database
    const { data: artist, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artist) {
      return artist;
    }
    
    // If not in database, fetch from Ticketmaster for non-tm- prefixed IDs
    if (!artistId.startsWith('tm-')) {
      // For actual TM IDs, fetch using attraction endpoint
      try {
        const data = await callTicketmasterApi(`attractions/${artistId}.json`);
        
        if (!data) {
          throw new Error("Artist not found");
        }
        
        const artistData = {
          id: data.id,
          name: data.name,
          image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genres: []
        };
        
        if (data.classifications && data.classifications.length > 0) {
          if (data.classifications[0].genre?.name) {
            artistData.genres.push(data.classifications[0].genre.name);
          }
          if (data.classifications[0].subGenre?.name) {
            artistData.genres.push(data.classifications[0].subGenre.name);
          }
        }
        
        // Save to database
        await saveArtistToDatabase(artistData);
        
        return artistData;
      } catch (fetchError) {
        console.error("Error fetching artist by ID:", fetchError);
        // Fall back to keyword search
      }
    }
    
    // For tm- prefixed IDs or if attraction endpoint failed, extract name and search
    const searchTerm = artistId.startsWith('tm-') 
      ? decodeURIComponent(artistId.replace('tm-', '')).replace(/-/g, ' ')
      : artistId;
    
    // Search for artist by name
    const artists = await searchArtistsWithEvents(searchTerm, 1);
    
    if (artists.length > 0) {
      return artists[0];
    }
    
    throw new Error("Artist not found");
  } catch (error) {
    console.error("Error in fetchArtistById:", error);
    toast.error("Failed to load artist details");
    throw error;
  }
}
