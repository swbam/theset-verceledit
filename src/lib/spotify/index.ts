
// Export all Spotify API functions
export { searchArtists } from './artist-search';
export { getArtistTopTracks } from './top-tracks';
export { getArtistAllTracks } from './all-tracks';
export { getStoredTracksFromDb } from './utils';

// Re-export utility functions (being careful not to duplicate)
export { convertStoredTracks, saveTracksToDb } from './utils';

// Export type definitions
export * from './types';

// Only export mock-tracks from one place to avoid ambiguity
export { generateMockTracks } from './utils';
