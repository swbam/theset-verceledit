
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
  fetchFeaturedShows,
  saveShowToDatabase,
  saveVenueToDatabase,
  saveArtistToDatabase
} from './api/shows-api';
