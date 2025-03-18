// Re-export all database utility functions from their respective files
export * from './db/artist-utils';
export * from './db/venue-utils';
// Export specific functions from show-utils to avoid naming conflicts
export {
  getShowsForArtist,
  createSetlistForShow
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

// Add missing saveShowToDatabase function
import { supabase } from '@/integrations/supabase/client';
import { saveVenueToDatabase } from './db/venue-utils';

export async function saveShowToDatabase(showData: any): Promise<string | null> {
  try {
    if (!showData || !showData.id) {
      console.error('Invalid show data', showData);
      return null;
    }

    // Check if show already exists
    const { data: existingShow } = await supabase
      .from('shows')
      .select('id')
      .eq('id', showData.id)
      .maybeSingle();

    // If show exists, update it
    if (existingShow) {
      const { error: updateError } = await supabase
        .from('shows')
        .update({
          name: showData.name,
          date: showData.date,
          image_url: showData.image_url,
          ticket_url: showData.ticket_url,
          artist_id: showData.artist_id,
          venue_id: showData.venue_id,
          last_updated: new Date().toISOString()
        })
        .eq('id', showData.id);

      if (updateError) {
        console.error('Error updating show:', updateError);
        return null;
      }
      
      return showData.id;
    }

    // If venue exists, save it first
    if (showData.venue) {
      const venueId = await saveVenueToDatabase(showData.venue);
      if (venueId) {
        showData.venue_id = venueId;
      }
    }

    // Insert new show
    const { error: insertError } = await supabase
      .from('shows')
      .insert({
        id: showData.id,
        name: showData.name,
        date: showData.date,
        image_url: showData.image_url,
        ticket_url: showData.ticket_url,
        artist_id: showData.artist_id,
        venue_id: showData.venue_id,
        last_updated: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting show:', insertError);
      return null;
    }

    return showData.id;
  } catch (error) {
    console.error('Error in saveShowToDatabase:', error);
    return null;
  }
}
