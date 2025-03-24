import { retryableFetch } from '@/lib/retry';

interface ArtistWithEvents {
  id: string;
  name: string;
  image?: string;
  upcomingShows?: number;
  genres?: string[];
  url?: string;
}

/**
 * Search for artists with events using Ticketmaster API
 * @param keyword Search keyword (artist name)
 * @param size Number of results to return (default: 10)
 * @returns Array of artists with event information
 */
export async function searchArtistsWithEvents(
  keyword: string,
  size: number = 10
): Promise<ArtistWithEvents[]> {
  try {
    if (!keyword) {
      return [];
    }

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
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
    return [];
  }
}

/**
 * Fetch featured artists based on popularity or upcoming shows
 */
export async function fetchFeaturedArtists(): Promise<ArtistWithEvents[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    // For now, just return some popular music artists as a fallback
    // In a real implementation, this would query Ticketmaster for popular artists
    return [
      {
        id: "K8vZ9171u-f",
        name: "Taylor Swift",
        image: "https://s1.ticketm.net/dam/a/1dd/d5e86d93-5e1a-49c9-b530-70fefc0f21dd_1877061_ARTIST_PAGE_3_2.jpg",
        upcomingShows: 30,
        genres: ["Pop", "Rock"]
      },
      {
        id: "K8vZ9171oZf",
        name: "Billie Eilish",
        image: "https://s1.ticketm.net/dam/a/ef8/e282c111-c3e6-4ebc-b115-b9b19b84bef8_1761451_ARTIST_PAGE_3_2.jpg",
        upcomingShows: 25,
        genres: ["Pop", "Alternative"]
      },
      {
        id: "K8vZ9175rX7",
        name: "The Weeknd",
        image: "https://s1.ticketm.net/dam/a/9cd/215d9bc8-01d1-407f-b2c2-9bd64290c9cd_1780221_ARTIST_PAGE_3_2.jpg",
        upcomingShows: 18,
        genres: ["R&B", "Pop"]
      }
    ];
  } catch (error) {
    console.error("Error fetching featured artists:", error);
    return [];
  }
}

/**
 * Fetch artist details by ID
 */
export async function fetchArtistById(artistId: string): Promise<ArtistWithEvents | null> {
  try {
    if (!artistId) {
      return null;
    }

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
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
    return null;
  }
}
