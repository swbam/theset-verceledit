
// Re-export all functions from the different modules
export { popularMusicGenres } from './api/ticketmaster-config';
export { searchArtistsWithEvents, fetchFeaturedArtists } from './api/artist-api';
export { 
  fetchArtistEvents, 
  fetchShowDetails, 
  fetchVenueDetails,
  fetchShowsByGenre,
  fetchFeaturedShows 
} from './api/shows-api';
