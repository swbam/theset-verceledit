import { Artist, ArtistWithEvents } from '@/lib/types';
import { retryableFetch } from '@/lib/utils';
import { callTicketmasterApi } from './ticketmaster-config';

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

    const data = await callTicketmasterApi('attractions.json', {
      keyword: encodeURIComponent(keyword),
      size: size.toString()
    });

    if (!data._embedded?.attractions) {
      return [];
    }

    return data._embedded.attractions.map((attraction: any) => ({
      id: attraction.id,
      name: attraction.name,
      image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      upcomingShows: attraction.upcomingEvents?._total || 0,
      genres: attraction.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
      url: attraction.url
    }));
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
    const data = await callTicketmasterApi('attractions.json', {
      classificationName: 'music',
      size: '10',
      sort: 'relevance,desc'
    });

    if (!data._embedded?.attractions) {
      return [];
    }

    return data._embedded.attractions.map((attraction: any) => ({
      id: attraction.id,
      name: attraction.name,
      image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      upcomingShows: attraction.upcomingEvents?._total || 0,
      genres: attraction.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
      url: attraction.url
    }));
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

    const data = await callTicketmasterApi(`attractions/${artistId}.json`);

    if (!data || !data.id) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      upcomingShows: data.upcomingEvents?._total || 0,
      genres: data.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
      url: data.url
    };
  } catch (error) {
    console.error("Error fetching artist by ID:", error);
    throw error;
  }
}
