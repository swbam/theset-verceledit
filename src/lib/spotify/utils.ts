import { SpotifyTrack } from '@/types/spotify';

// Mock data generation
export function generateMockTracks(count: number = 10): SpotifyTrack[] {
  const mockTracks: SpotifyTrack[] = [];
  const songNames = [
    "Bohemian Rhapsody", "Stairway to Heaven", "Hotel California", 
    "Sweet Child O' Mine", "Imagine", "Smells Like Teen Spirit", 
    "Billie Jean", "Like a Rolling Stone", "Purple Haze", 
    "Johnny B. Goode", "Hey Jude", "Born to Run", "Respect",
    "Good Vibrations", "Yesterday", "London Calling", "Waterloo Sunset",
    "God Save the Queen", "Gimme Shelter", "Superstition"
  ];
  
  const artistNames = [
    "Queen", "Led Zeppelin", "Eagles", "Guns N' Roses", "John Lennon",
    "Nirvana", "Michael Jackson", "Bob Dylan", "Jimi Hendrix", "Chuck Berry",
    "The Beatles", "Bruce Springsteen", "Aretha Franklin", "The Beach Boys",
    "The Kinks", "Sex Pistols", "The Rolling Stones", "Stevie Wonder"
  ];
  
  for (let i = 0; i < count; i++) {
    const randomSongIndex = Math.floor(Math.random() * songNames.length);
    const randomArtistIndex = Math.floor(Math.random() * artistNames.length);
    
    mockTracks.push({
      id: `mock-track-${i}`,
      name: songNames[randomSongIndex],
      album: {
        images: [{ url: `https://picsum.photos/seed/${i}/300/300` }]
      },
      artists: [{ name: artistNames[randomArtistIndex] }],
      uri: `spotify:track:mock-${i}`,
      duration_ms: Math.floor(Math.random() * 300000) + 120000, // 2-7 minutes
      popularity: Math.floor(Math.random() * 100)
    });
  }
  
  return mockTracks;
}

// Database operations for tracks
export async function getStoredTracksFromDb(artistId: string): Promise<any[]> {
  // This would normally fetch from a database
  console.log(`Checking for stored tracks for artist ${artistId}`);
  return []; // Return empty array to indicate no cached data
}

export function saveTracksToDb(artistId: string, tracks: SpotifyApi.TrackObjectSimplified[]) {
  // Implementation for saving tracks to database
  console.log(`Saving ${tracks.length} tracks for artist ${artistId} to database`);
  // Database save logic would go here
  return tracks;
}

export function convertStoredTracks(storedTracks: any[]) {
  // Convert stored tracks from DB format to Spotify format
  return {
    tracks: storedTracks.map(track => ({
      id: track.id,
      name: track.name,
      album: {
        images: track.album_image ? [{ url: track.album_image }] : []
      },
      artists: [{ name: track.artist_name }],
      uri: track.uri || `spotify:track:${track.id}`,
      duration_ms: track.duration_ms || 0,
      popularity: track.popularity || 0
    }))
  };
}

// Ensure we're not duplicating exports
export { generateMockTracks } from './mock-tracks';
