import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

interface SpotifySong {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
}

interface TicketmasterShow {
  id: string;
  name: string;
  dates: {
    start: {
      dateTime?: string;
      localDate?: string;
    };
    status: {
      code: string;
    };
  };
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  url?: string;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: {
        name: string;
      };
      state?: {
        name: string;
      };
      country?: {
        name: string;
      };
      address?: {
        line1: string;
      };
      location?: {
        latitude: string;
        longitude: string;
      };
      postalCode?: string;
      images?: Array<{
        url: string;
      }>;
      url?: string;
    }>;
  };
}

async function handleApiResponse<T>(response: Response, apiName: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = `${apiName} API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = `${apiName} API error: ${errorData.error?.message || errorData.error || response.statusText}`;
    } catch (e: unknown) {
      // If JSON parsing fails, use the default error message
      console.warn(`Failed to parse error response from ${apiName} API:`, (e as Error).message);
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (e: unknown) {
    const error = e as Error;
    throw new Error(`Failed to parse ${apiName} API response: ${error.message}`);
  }
}

export async function fetchSpotifyArtist(spotifyId: string, accessToken: string): Promise<SpotifyArtist> {
  if (!spotifyId || !accessToken) {
    throw new Error('Spotify ID and access token are required');
  }

  console.log(`[Spotify] Fetching artist data for ID: ${spotifyId}`);
  
  const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  return handleApiResponse<SpotifyArtist>(response, 'Spotify');
}

export async function fetchSpotifyArtistSongs(spotifyId: string, accessToken: string): Promise<SpotifySong[]> {
  if (!spotifyId || !accessToken) {
    throw new Error('Spotify ID and access token are required');
  }

  console.log(`[Spotify] Fetching top tracks for artist ID: ${spotifyId}`);
  
  const songs: SpotifySong[] = [];
  const url = `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  const data = await handleApiResponse<any>(response, 'Spotify');
  
  if (!Array.isArray(data.tracks)) {
    throw new Error('Invalid response format: tracks array not found');
  }

  songs.push(...data.tracks.map((track: any) => ({
    id: track.id,
    name: track.name,
    duration_ms: track.duration_ms || 0,
    popularity: track.popularity || 0
  })));

  console.log(`[Spotify] Found ${songs.length} tracks for artist ID: ${spotifyId}`);
  return songs;
}

export async function fetchTicketmasterShows(artistId: string, apiKey: string): Promise<TicketmasterShow[]> {
  if (!artistId || !apiKey) {
    throw new Error('Artist ID and API key are required');
  }

  console.log(`[Ticketmaster] Fetching shows for artist ID: ${artistId}`);

  const params = new URLSearchParams({
    attractionId: artistId,
    apikey: apiKey,
    size: '100',
    sort: 'date,asc',
    includeTBA: 'no',
    includeTest: 'no'
  });

  const response = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
    {
      headers: { 'Accept': 'application/json' }
    }
  );

  const data = await handleApiResponse<any>(response, 'Ticketmaster');
  const events = data._embedded?.events || [];
  
  console.log(`[Ticketmaster] Found ${events.length} shows for artist ID: ${artistId}`);
  return events;
}

export function extractVenueFromShow(show: TicketmasterShow) {
  const venue = show._embedded?.venues?.[0];
  if (!venue?.id || !venue.name) {
    console.log('[Venue] Skipping venue extraction - missing required fields');
    return null;
  }

  console.log(`[Venue] Extracting venue data: ${venue.name} (${venue.id})`);

  return {
    tm_venue_id: venue.id,
    name: venue.name,
    city: venue.city?.name || null,
    state: venue.state?.name || null,
    country: venue.country?.name || null,
    address: venue.address?.line1 || null,
    latitude: venue.location?.latitude || null,
    longitude: venue.location?.longitude || null,
    postal_code: venue.postalCode || null,
    image_url: venue.images?.[0]?.url || null,
    url: venue.url || null
  };
}
