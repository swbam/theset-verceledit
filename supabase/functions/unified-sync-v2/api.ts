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

// --- Setlist.fm Types ---
interface SetlistFmSong {
  name: string;
  info?: string;
}

interface SetlistFmSet {
  encore?: number; // Or boolean depending on API version
  song: SetlistFmSong[];
}

interface SetlistFmVenue {
  name: string;
  city?: {
    name: string;
    state?: string;
    country?: {
      code: string;
      name: string;
    };
  };
  id?: string; // Sometimes available
}

interface SetlistFmArtist {
  mbid?: string;
  name: string;
}

interface SetlistFmSetlist {
  id: string; // Setlist.fm's unique ID for the setlist
  versionId?: string;
  eventDate: string; // DD-MM-YYYY format
  lastUpdated?: string; // ISO 8601 format
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: { name: string };
  sets: {
    set: SetlistFmSet[];
  };
  info?: string;
  url?: string;
}

interface SetlistFmResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: SetlistFmSetlist[];
}
// --- End Setlist.fm Types ---

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

export async function fetchTicketmasterShows(artistId: string, apiKey: string, page = 0): Promise<{ shows: TicketmasterShow[], page: number, totalPages: number }> {
  if (!artistId || !apiKey) {
    throw new Error('Artist ID and API key are required');
  }

  console.log(`[Ticketmaster] Fetching shows for artist ID: ${artistId}, page: ${page}`);
  
  const size = 20; // Ticketmaster's default page size
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${artistId}&apikey=${apiKey}&size=${size}&page=${page}`;

  const response = await fetch(url);
  const data = await handleApiResponse<any>(response, 'Ticketmaster');

  if (!data._embedded?.events) {
    return { shows: [], page, totalPages: 0 };
  }

  const shows = data._embedded.events;
  const totalPages = Math.ceil(data.page.totalElements / size);

  console.log(`[Ticketmaster] Found ${shows.length} shows on page ${page + 1} of ${totalPages}`);
  return { shows, page, totalPages };
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

// Add a new function to fetch a single venue by its Ticketmaster ID
export async function fetchTicketmasterVenue(venueId: string, apiKey: string): Promise<any> {
  if (!venueId || !apiKey) {
    throw new Error('Venue ID and API key are required for Ticketmaster venue fetch');
  }
  
  console.log(`[Ticketmaster] Fetching venue data for ID: ${venueId}`);

  const params = new URLSearchParams({
    id: venueId,
    apikey: apiKey
  });

  // Use the venues endpoint
  const response = await fetch(
    `https://app.ticketmaster.com/discovery/v2/venues/${venueId}.json?${params.toString()}`,
    {
      headers: { 'Accept': 'application/json' }
    }
  );

  // Need to handle potential 404s or other errors specifically for single venue fetch
  if (response.status === 404) {
    console.warn(`[Ticketmaster] Venue with ID ${venueId} not found.`);
    return null; // Or throw a specific error if preferred
  }

  return handleApiResponse<any>(response, 'Ticketmaster Venue');
}

export async function fetchSetlistFmSetlists(
  artistMbid: string | null,
  artistName: string,
  apiKey: string,
  page = 1
): Promise<SetlistFmResponse> {
  if ((!artistMbid && !artistName) || !apiKey) {
    throw new Error('Artist MBID or Name, and API key are required for Setlist.fm fetch');
  }

  const searchParam = artistMbid ? 'artistMbid' : 'artistName';
  const searchValue = artistMbid || artistName;

  console.log(`[Setlist.fm] Fetching setlists for ${searchParam}=${searchValue}, page ${page}`);

  const params = new URLSearchParams({
    [searchParam]: searchValue,
    p: page.toString(),
    // Add other params like year if needed
  });

  const response = await fetch(
    `https://api.setlist.fm/rest/1.0/search/setlists?${params.toString()}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        // Setlist.fm might require specific Accept-Language for consistency
        'Accept-Language': 'en',
      }
    }
  );

  // Setlist.fm returns 404 if no setlists found, handle gracefully
  if (response.status === 404) {
     console.log(`[Setlist.fm] No setlists found for ${searchParam}=${searchValue} (404)`);
     return { type: 'setlists', itemsPerPage: 0, page: 1, total: 0, setlist: [] };
  }

  // Use the existing handler for other errors/success
  return handleApiResponse<SetlistFmResponse>(response, 'Setlist.fm');
}
