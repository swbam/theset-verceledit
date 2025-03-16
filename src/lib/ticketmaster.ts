
// Re-export all functions from the different modules
export { popularMusicGenres } from './api/ticketmaster-config';
export { 
  searchArtistsWithEvents, 
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist-api';
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
  const { data, error } = await supabase.functions.invoke('fetch-past-setlists', {
    body: { artistId, artistName }
  });
  
  if (error) {
    console.error("Error fetching past setlists:", error);
    throw error;
  }
  
  return data.setlists;
};
