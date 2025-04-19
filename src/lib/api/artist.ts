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

    // Call our Supabase Edge Function `search-attractions` to avoid CORS and hide API key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }

    const response = await retryableFetch(async () => {
      const result = await fetch(`${supabaseUrl}/functions/v1/search-attractions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No auth header required – function deployed with --no-verify-jwt
        },
        body: JSON.stringify({ keyword, size })
      });

      if (!result.ok) {
        const text = await result.text();
        throw new Error(`search-attractions error (${result.status}): ${text}`);
      }

      return result.json();
    }, { retries: 3 });

    // The Edge Function already returns normalized list
    if (!response.artists) {
      return [];
    }

    return response.artists;
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
     console.warn("API key missing, returning empty array.");
     // If no API key, return empty array immediately
     return [];
     // Removed hardcoded data and redundant return
   }

   // API call logic now correctly placed outside the if block
   // Fetch featured artists (e.g., based on music classification, sorted by relevance/popularity)
    const response = await retryableFetch(async () => {
      // Example: Fetch top 10 music attractions sorted by relevance
      const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&classificationName=music&size=10&sort=relevance,desc`;
      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.attractions) {
      console.log("No featured artists found from Ticketmaster.");
      return [];
    }

    // Map response to ArtistWithEvents format
    const artists = response._embedded.attractions.map((attraction: any): ArtistWithEvents => {
      let image;
      if (attraction.images && attraction.images.length > 0) {
        const sortedImages = [...attraction.images].sort((a, b) => (b.width || 0) - (a.width || 0));
        image = sortedImages[0]?.url;
      }
      const upcomingShows = attraction.upcomingEvents?._total || 0;
      let genres: string[] = [];
      if (attraction.classifications?.[0]) {
        const classification = attraction.classifications[0];
        genres = [classification.genre?.name, classification.subGenre?.name].filter(Boolean) as string[];
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
