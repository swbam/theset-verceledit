
// Re-export all functions from the different modules
// This maintains the existing API so imports don't break

export {
  popularMusicGenres,
  getTrendingConcerts,
  callTicketmasterApi
} from './config';

export {
  fetchTrendingShows,
  fetchUpcomingShows,
  fetchShowDetails,
  fetchShowsByGenre,
  fetchFeaturedShows,
  getArtistEvents
} from './shows';

export {
  searchArtistsWithEvents,
  getArtistDetails,
  fetchArtistById,
  fetchFeaturedArtists
} from './artists';

export {
  fetchVenueDetails
} from './venues';

// Re-export utility functions for saving data to the database
export { 
  saveArtistToDatabase
} from '../db/artist-utils';

export { 
  saveShowToDatabase
} from '../database-utils';

export { 
  saveVenueToDatabase
} from '../db/venue-utils';

// Re-export the setlist.fm related functions
export { fetchPastSetlists } from './setlists';
