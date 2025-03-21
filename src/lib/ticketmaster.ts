
// Re-export all functions from the different modules
export { popularMusicGenres } from './api/ticketmaster-config';

// Artist related functions
export { 
  searchArtistsWithEvents, 
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist';

// Show related functions
export { 
  fetchArtistEvents, 
  fetchShowDetails, 
  fetchVenueDetails,
  fetchShowsByGenre,
  fetchFeaturedShows
} from './api/shows';

// Export utility functions for saving data to the database
export { 
  saveArtistToDatabase,
  saveShowToDatabase,
  saveVenueToDatabase
} from './api/database-utils';

// Setlist.fm related functions
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    // Directly return hardcoded past setlists data as fallback
    return [];
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    return [];
  }
};
