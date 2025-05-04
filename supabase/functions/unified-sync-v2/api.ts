// API integration helpers for unified-sync-v2

// --- Spotify API ---
export async function fetchSpotifyArtist(spotifyId: string, accessToken: string) {
  const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Spotify artist fetch failed: ${res.status}`);
  return await res.json();
}

export async function fetchSpotifyArtistTracks(spotifyId: string, accessToken: string) {
  const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Spotify tracks fetch failed: ${res.status}`);
  return (await res.json()).tracks;
}

// --- Ticketmaster API ---
export async function fetchTicketmasterShows(artistName: string, apiKey: string) {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artistName)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster fetch failed: ${res.status}`);
  const data = await res.json();
  return data._embedded?.events || [];
}

// --- Setlist.fm API ---
export async function fetchSetlists(artistMbid: string, apiKey: string) {
  const url = `https://api.setlist.fm/rest/1.0/artist/${artistMbid}/setlists?p=1`;
  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error(`Setlist.fm fetch failed: ${res.status}`);
  const data = await res.json();
  return data.setlist || [];
}

// --- Venue Extraction ---
export function extractVenueFromShow(show: any) {
  if (!show._embedded || !show._embedded.venues || !show._embedded.venues[0]) return null;
  const v = show._embedded.venues[0];
  return {
    tm_venue_id: v.id,
    name: v.name,
    city: v.city?.name,
    state: v.state?.name,
    country: v.country?.name,
    address: v.address?.line1,
    capacity: v.capacity,
    latitude: v.location?.latitude,
    longitude: v.location?.longitude
  };
}

// --- Setlist Songs Extraction ---
export function extractSetlistSongs(setlist: any) {
  if (!setlist.sets || !setlist.sets.set) return [];
  const songs: any[] = [];
  for (const set of setlist.sets.set) {
    if (set.song) {
      for (const song of set.song) {
        songs.push({
          name: song.name,
          encore: song.encore || null,
          cover: song.cover?.name || null
        });
      }
    }
  }
  return songs;
}
