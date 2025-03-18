// Export all Spotify API functions
export { searchArtists, getArtistById, getArtistByName } from './artist-search';
export { getArtistTopTracks } from './top-tracks';
export { getArtistAllTracks } from './all-tracks';
export { getMyTopArtists, getUserRecommendations } from './user-recommendations';
export { getStoredTracksFromDb, getArtistTopTracksFromDb } from './utils';

// Re-export utility functions (being careful not to duplicate)
export { convertStoredTracks, saveTracksToDb } from './utils';

// Export type definitions
export * from './types';

// Import the function before re-exporting it as an alias
import { getArtistAllTracks } from './all-tracks';
// Add getAllArtistTracks as alias for getArtistAllTracks for compatibility
export const getAllArtistTracks = getArtistAllTracks;
