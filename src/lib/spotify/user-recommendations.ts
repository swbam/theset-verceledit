
import { SpotifyTrack } from './types';
import { generateMockTracks } from './utils';
import { getAccessToken } from './auth';

// Get user's top artists
export async function getMyTopArtists() {
  console.log("Fetching user's top artists");
  // This would normally fetch from Spotify API with user authentication
  // For now, just return a mock array with some artists
  
  // In a real implementation, this would fetch from:
  // https://api.spotify.com/v1/me/top/artists
  
  try {
    // Normally we would use a user token, not the client credentials token
    // const token = await getAccessToken();
    
    // Mock data since we don't have user authentication implemented yet
    const mockArtists = [
      {
        id: "4Z8W4fKeB5YxbusRsdQVPb",
        name: "Radiohead",
        images: [{ url: "https://i.scdn.co/image/ab67616d00001e02de3c04b5fc750b68899b20a9" }],
        genres: ["alternative rock", "art rock", "melancholia"],
        followers: { total: 11876887 }
      },
      {
        id: "0L8ExT028jH3ddEcZwqJJ5",
        name: "Red Hot Chili Peppers",
        images: [{ url: "https://i.scdn.co/image/ab67616d00001e0268283f7b969e4099a700a1d1" }],
        genres: ["alternative rock", "funk rock", "rock"],
        followers: { total: 16660268 }
      },
      {
        id: "6FQqZYVfTNQ1pCqfkwVFEa",
        name: "Foals",
        images: [{ url: "https://i.scdn.co/image/ab67616d00001e02ead87e33b924f915704ce1a8" }],
        genres: ["alternative dance", "indie rock", "modern rock"],
        followers: { total: 1582053 }
      }
    ];
    
    return mockArtists;
  } catch (error) {
    console.error("Error fetching top artists:", error);
    return [];
  }
}

export async function getUserRecommendations() {
  console.log("Fetching user's recommendations");
  // This would normally fetch from Spotify API with user authentication
  return { tracks: generateMockTracks(10) };
}
