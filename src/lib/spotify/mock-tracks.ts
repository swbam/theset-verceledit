
import { SpotifyTrack, SpotifyTracksResponse } from './types';

/**
 * Generates mock track data when Spotify API is unavailable
 */
export const generateMockTracks = (artistId: string, count = 40): SpotifyTracksResponse => {
  console.log(`Generating ${count} mock tracks for artist ${artistId}`);
  
  const tracks = Array.from({ length: count }, (_, i) => {
    const popularity = Math.max(10, 100 - i * 2); // Higher indices get lower popularity
    return {
      id: `mock-${artistId}-${i}`,
      name: `${i < 10 ? 'Top Hit' : 'Song'} ${i + 1}`,
      duration_ms: 180000 + Math.floor(Math.random() * 120000),
      popularity: popularity,
      preview_url: null,
      uri: `spotify:track:mock-${artistId}-${i}`,
      album: i < 15 ? 'Greatest Hits' : `Album ${Math.floor(i / 5) + 1}`,
      votes: 0
    };
  });
  
  return { tracks };
};
