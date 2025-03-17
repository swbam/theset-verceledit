
// Re-export all functions from the different modules
export { popularMusicGenres } from './api/ticketmaster-config';
export { 
  searchArtistsWithEvents, 
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist';  // Updated import path to use the index.ts in the artist folder
export { 
  fetchArtistEvents, 
  fetchShowDetails, 
  fetchVenueDetails,
  fetchShowsByGenre,
  fetchFeaturedShows
} from './api/shows-api';

// Export utility functions for saving data to the database
export { 
  saveArtistToDatabase,
  saveShowToDatabase,
  saveVenueToDatabase
} from './api/database-utils';

// Import supabase client
import { supabase } from '@/integrations/supabase/client';

// Setlist.fm related functions
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-past-setlists', {
      body: { artistId, artistName }
    });
    
    if (error) {
      console.error("Error fetching past setlists:", error);
      throw error;
    }
    
    return data.setlists;
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    throw error;
  }
};
