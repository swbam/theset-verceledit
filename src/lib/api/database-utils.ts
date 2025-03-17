
// Re-export all database utility functions from their respective files
export * from './db/artist-utils';
export * from './db/venue-utils';
// Export specific functions from show-utils to avoid naming conflicts
export {
  getShowsForArtist,
  createSetlistForShow,
  saveShowToDatabase
} from './db/show-utils';
// Export specific functions from setlist-utils to avoid naming conflicts
export { 
  getSetlistSongs, 
  addSongToSetlist, 
  addTracksToSetlist, 
  createSetlist, 
  getSetlistForShow 
} from './db/setlist-utils';
export type { SetlistSong } from './db/setlist-utils';
// We're explicitly re-exporting voteForSong with a different name to avoid conflicts
export { voteForSong as voteSetlistSong } from './db/vote-utils';
export * from './db/vote-utils';
// Remove the show-database-utils export as we're consolidating with show-utils
