// Re-export all database utility functions from their respective files
export * from './db/artist-utils';
export * from './db/venue-utils';
// Export specific functions from show-utils to avoid naming conflicts
export {
  getShowsForArtist,
  createSetlistForShow,
  addSongsToSetlist
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

/**
 * Interface for show data
 */
export interface ShowData {
  id: string;
  name?: string;
  date?: string;
  image_url?: string;
  ticket_url?: string;
  artist_id?: string;
  venue_id?: string;
  venue?: {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Save show data to the database
 * @param showData Show data to save
 * @returns Show ID if successful, null otherwise
 */
export async function saveShowToDatabase(showData: ShowData): Promise<string | null> {
  try {
    if (!showData || !showData.id) {
      console.error('Invalid show data', showData);
      return null;
    }

    // Check if show already exists
    try {
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('id')
        .eq('id', showData.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing show:', checkError);
        // Continue anyway - we'll try to insert/update
      }

      // If show exists, update it
      if (existingShow) {
        try {
          const { error: updateError } = await supabase
            .from('shows')
            .update({
              name: showData.name,
              date: showData.date || new Date().toISOString(),
              image_url: showData.image_url,
              ticket_url: showData.ticket_url,
              artist_id: showData.artist_id,
              venue_id: showData.venue_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', showData.id);

          if (updateError) {
            console.error('Error updating show:', updateError);
            // Continue anyway - the show exists, so we can return the ID
          }
          
          return showData.id;
        } catch (updateError) {
          console.error('Exception updating show:', updateError);
          // Continue anyway - the show exists, so we can return the ID
          return showData.id;
        }
      }
    } catch (checkError) {
      console.error('Exception checking for existing show:', checkError);
      // Continue anyway - we'll try to insert
    }

    // If venue exists, save it first
    if (showData.venue) {
      try {
        const venueId = await saveVenueToDatabase(showData.venue);
        if (venueId) {
          showData.venue_id = venueId;
        }
      } catch (venueError) {
        console.error('Error saving venue:', venueError);
        // Continue anyway - we can still save the show without venue
      }
    }

    // Prepare show data with defaults for missing fields
    const showToInsert = {
      id: showData.id,
      name: showData.name || 'Untitled Show',
      date: showData.date || new Date().toISOString(),
      image_url: showData.image_url,
      ticket_url: showData.ticket_url,
      artist_id: showData.artist_id,
      venue_id: showData.venue_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert new show
    try {
      const { error: insertError } = await supabase
        .from('shows')
        .insert(showToInsert);

      if (insertError) {
        // Check if it's a duplicate key error (someone else might have created it)
        if (insertError.code === '23505') {
          console.log(`Duplicate key error - show ${showData.id} may already exist`);
          return showData.id;
        }
        
        console.error('Error inserting show:', insertError);
        return null;
      }

      return showData.id;
    } catch (insertError) {
      console.error('Exception inserting show:', insertError);
      
      // One last attempt to check if the show exists
      try {
        const { data: finalCheck } = await supabase
          .from('shows')
          .select('id')
          .eq('id', showData.id)
          .maybeSingle();
          
        if (finalCheck?.id) {
          return finalCheck.id;
        }
      } catch (finalError) {
        console.error('Final check for show failed:', finalError);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error in saveShowToDatabase:', error);
    return null;
  }
}
