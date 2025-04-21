import { retry } from './retryUtils.ts';
import type { SetlistFmResponse, SetlistFmSetlist } from './types.ts';

const SETLISTFM_API_KEY = Deno.env.get('SETLISTFM_API_KEY');

/**
 * Fetch past setlists for an artist from setlist.fm
 */
export async function fetchArtistSetlists(artistName: string, mbid?: string): Promise<SetlistFmResponse> {
  try {
    if (!SETLISTFM_API_KEY) {
      throw new Error('Setlist.fm API key is not configured');
    }

    console.log(`[EF fetchArtistSetlists] Fetching setlists for artist: ${artistName}${mbid ? ` (MBID: ${mbid})` : ''}`);

    const searchParam = mbid ? 'artistMbid' : 'artistName';
    const searchValue = mbid || artistName;

    const response = await retry(async () => {
      const result = await fetch(
        `https://api.setlist.fm/rest/1.0/search/setlists?${searchParam}=${encodeURIComponent(searchValue)}&p=1`,
        {
          headers: {
            'x-api-key': SETLISTFM_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!result.ok) {
        const errorText = await result.text();
        console.error(`[EF fetchArtistSetlists] Setlist.fm API error: ${result.status}`, errorText);
        throw new Error(`Setlist.fm API error: ${result.status}`);
      }

      return result.json();
    }, {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      onRetry: (error: Error, attempt: number) => {
        console.warn(`[EF fetchArtistSetlists] Retry attempt ${attempt}:`, error);
      }
    });

    if (!response.setlist || !Array.isArray(response.setlist)) {
      console.log(`[EF fetchArtistSetlists] No setlists found for artist: ${artistName}`);
      return { setlist: [] };
    }

    console.log(`[EF fetchArtistSetlists] Found ${response.setlist.length} setlists for artist: ${artistName}`);
    return response;

  } catch (error) {
    console.error(`[EF fetchArtistSetlists] Error fetching setlists for artist ${artistName}:`, error);
    throw error;
  }
}

/**
 * Process a setlist.fm setlist into our database format
 */
export function processSetlistData(setlist: SetlistFmSetlist) {
  const songs = [];
  let position = 1;

  if (setlist.sets?.set) {
    for (const set of setlist.sets.set) {
      const isEncore = set.encore || false;
      for (const song of (set.song || [])) {
        songs.push({
          name: song.name,
          position: position++,
          is_encore: isEncore,
          info: song.info || null
        });
      }
    }
  }

  return {
    setlist_id: setlist.id,
    eventDate: setlist.eventDate ? 
      `${setlist.eventDate.slice(6, 10)}-${setlist.eventDate.slice(3, 5)}-${setlist.eventDate.slice(0, 2)}` : 
      null,
    venue: {
      name: setlist.venue.name,
      city: setlist.venue.city.name,
      country: setlist.venue.city.country.name
    },
    songs
  };
}
