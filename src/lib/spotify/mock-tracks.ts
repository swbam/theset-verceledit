
import { SpotifyTrack } from './types';

// Mock data generation with artistId support
export function generateMockTracks(artistIdOrCount: string | number, count?: number): { tracks: SpotifyTrack[] } {
  // Handle the case where the first parameter is the artist ID
  const actualCount = typeof artistIdOrCount === 'number' 
    ? artistIdOrCount 
    : (count || 10);
  
  const artistName = typeof artistIdOrCount === 'string' && !artistIdOrCount.startsWith('mock')
    ? `Artist ${artistIdOrCount.substring(0, 5)}`
    : 'Mock Artist';

  console.log(`Generating ${actualCount} mock tracks for ${artistName}`);
  
  const mockTracks: SpotifyTrack[] = [];
  const songNames = [
    "Bohemian Rhapsody", "Stairway to Heaven", "Hotel California", 
    "Sweet Child O' Mine", "Imagine", "Smells Like Teen Spirit", 
    "Billie Jean", "Like a Rolling Stone", "Purple Haze", 
    "Johnny B. Goode", "Hey Jude", "Born to Run", "Respect",
    "Good Vibrations", "Yesterday", "London Calling", "Waterloo Sunset",
    "God Save the Queen", "Gimme Shelter", "Superstition"
  ];
  
  for (let i = 0; i < actualCount; i++) {
    const index = Math.min(i, songNames.length - 1);
    mockTracks.push({
      id: `mock-track-${i}`,
      name: songNames[index],
      album: {
        images: [{ url: `https://picsum.photos/seed/${i}/300/300` }]
      },
      artists: [{ name: artistName }],
      uri: `spotify:track:mock-${i}`,
      duration_ms: Math.floor(Math.random() * 300000) + 120000, // 2-7 minutes
      popularity: Math.floor(Math.random() * 100)
    });
  }
  
  return { tracks: mockTracks };
}
