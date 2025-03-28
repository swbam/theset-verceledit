import { retryableFetch } from '@/lib/retry';

export interface ArtistWithEvents { // Add export keyword
  id: string;
  name: string;
  image?: string;
  upcomingShows?: number;
  genres?: string[];
  url?: string;
}

/**
 * Search for artists with events using Ticketmaster API (Client-side usage)
 */
export async function searchArtistsWithEvents(
  keyword: string,
  size: number = 10
): Promise<ArtistWithEvents[]> {
  try {
    if (!keyword) {
      return [];
    }

    // Use import.meta.env for client-side access in Vite
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured in environment variables");
      // Optionally throw an error or return a specific error state
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(keyword)}&size=${size}`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.attractions) {
      return [];
    }

    const artists = response._embedded.attractions.map((attraction: any) => {
      // Get the best image
      let image;
      if (attraction.images && attraction.images.length > 0) {
        // Try to get a high quality image
        const sortedImages = [...attraction.images].sort((a, b) => 
          (b.width || 0) - (a.width || 0)
        );
        
        image = sortedImages[0]?.url;
      }

      // Extract upcoming shows count
      let upcomingShows = 0;
      if (attraction.upcomingEvents && typeof attraction.upcomingEvents._total === 'number') {
        upcomingShows = attraction.upcomingEvents._total;
      }

      // Extract genres
      let genres: string[] = [];
      if (attraction.classifications && attraction.classifications.length > 0) {
        const classification = attraction.classifications[0];
        const genreSegments = [
          classification.genre?.name,
          classification.subGenre?.name,
        ].filter(Boolean);
        
        genres = genreSegments;
      }

      return {
        id: attraction.id,
        name: attraction.name,
        image,
        upcomingShows,
        genres,
        url: attraction.url,
      };
    });

    return artists;
  } catch (error) {
    console.error("Error searching artists:", error);
    // Rethrow or return error state for UI
    throw error; // Let the calling component handle the error display
  }
}

/**
 * Fetch featured artists based on popularity or upcoming shows (Client-side usage)
 */
export async function fetchFeaturedArtists(): Promise<ArtistWithEvents[]> {
  try {
    // Use import.meta.env for client-side access in Vite
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      // Return fallback or empty array
      // The existing fallback is okay, but log the warning
      console.warn("API key missing, returning hardcoded featured artists.");
      // Return existing hardcoded fallback
       return [
         { id: "K8vZ9171u-f", name: "Taylor Swift", image: "https://s1.ticketm.net/dam/a/1dd/d5e86d93-5e1a-49c9-b530-70fefc0f21dd_1877061_ARTIST_PAGE_3_2.jpg", upcomingShows: 30, genres: ["Pop", "Rock"] },
         { id: "K8vZ9171oZf", name: "Billie Eilish", image: "https://s1.ticketm.net/dam/a/ef8/e282c111-c3e6-4ebc-b115-b9b19b84bef8_1761451_ARTIST_PAGE_3_2.jpg", upcomingShows: 25, genres: ["Pop", "Alternative"] },
         { id: "K8vZ9175rX7", name: "The Weeknd", image: "https://s1.ticketm.net/dam/a/9cd/215d9bc8-01d1-407f-b2c2-9bd64290c9cd_1780221_ARTIST_PAGE_3_2.jpg", upcomingShows: 18, genres: ["R&B", "Pop"] }
       ];
    }

    // TODO: Replace fallback with actual Ticketmaster API call using apiKey
    console.warn("fetchFeaturedArtists is using hardcoded data. Implement actual API call.");
    return [
      { id: "K8vZ9171u-f", name: "Taylor Swift", image: "https://s1.ticketm.net/dam/a/1dd/d5e86d93-5e1a-49c9-b530-70fefc0f21dd_1877061_ARTIST_PAGE_3_2.jpg", upcomingShows: 30, genres: ["Pop", "Rock"] },
      { id: "K8vZ9171oZf", name: "Billie Eilish", image: "https://s1.ticketm.net/dam/a/ef8/e282c111-c3e6-4ebc-b115-b9b19b84bef8_1761451_ARTIST_PAGE_3_2.jpg", upcomingShows: 25, genres: ["Pop", "Alternative"] },
      { id: "K8vZ9175rX7", name: "The Weeknd", image: "https://s1.ticketm.net/dam/a/9cd/215d9bc8-01d1-407f-b2c2-9bd64290c9cd_1780221_ARTIST_PAGE_3_2.jpg", upcomingShows: 18, genres: ["R&B", "Pop"] }
    ];

  } catch (error) {
    console.error("Error fetching featured artists:", error);
    return [];
  }
}

/**
 * Fetch artist details by ID (Client-side usage)
 */
export async function fetchArtistById(artistId: string): Promise<ArtistWithEvents | null> {
  try {
    if (!artistId) {
      return null;
    }

    // Use import.meta.env for client-side access in Vite
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      return null;
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/attractions/${artistId}.json?apikey=${apiKey}`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) {
      return null;
    }

    // Get the best image
    let image;
    if (response.images && response.images.length > 0) {
      const sortedImages = [...response.images].sort((a, b) => 
        (b.width || 0) - (a.width || 0)
      );
      
      image = sortedImages[0]?.url;
    }

    // Extract upcoming shows count
    let upcomingShows = 0;
    if (response.upcomingEvents && typeof response.upcomingEvents._total === 'number') {
      upcomingShows = response.upcomingEvents._total;
    }

    // Extract genres
    let genres: string[] = [];
    if (response.classifications && response.classifications.length > 0) {
      const classification = response.classifications[0];
      const genreSegments = [
        classification.genre?.name,
        classification.subGenre?.name,
      ].filter(Boolean);
      
      genres = genreSegments;
    }

    return {
      id: response.id,
      name: response.name,
      image,
      upcomingShows,
      genres,
      url: response.url,
    };
  } catch (error) {
    console.error("Error fetching artist by ID:", error);
    // Rethrow or return null
    throw error; // Let the calling component handle UI
  }
}
