
// Re-export everything from the new ticketmaster API structure
// This maintains backward compatibility with existing code

export {
  TICKETMASTER_API_KEY,
  TICKETMASTER_BASE_URL,
  callTicketmasterApi,
  getTrendingConcerts,
  popularMusicGenres
} from './api/ticketmaster/config';

export {
  fetchTrendingShows,
  fetchUpcomingShows,
  fetchShowDetails,
  fetchShowsByGenre,
  fetchFeaturedShows
} from './api/ticketmaster/shows';

export {
  searchArtistsWithEvents,
  getArtistEvents,
  getArtistDetails,
  fetchArtistById,
  fetchFeaturedArtists
} from './api/ticketmaster/artists';

export {
  fetchVenueDetails
} from './api/ticketmaster/venues';

export {
  fetchPastSetlists
} from './api/ticketmaster/setlists';

// Export utility functions for saving data to the database
export { 
  saveArtistToDatabase
} from './api/db/artist-utils';

export { 
  saveShowToDatabase
} from './api/database-utils';

export { 
  saveVenueToDatabase
} from './api/db/venue-utils';

// Import supabase client
import { supabase } from '@/lib/supabase';
