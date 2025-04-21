import { supabaseAdmin } from './supabaseClient.ts';
import { saveSongToDatabase } from './songDbUtils.ts';
import type { SetlistSong } from './types.ts';

/**
 * Save setlist songs to the database, creating any missing songs first
 */
export async function saveSetlistSongs(
  setlistId: string,
  artistId: string,
  songs: Array<{ name: string; position: number; is_encore: boolean; info?: string | null }>
): Promise<boolean> {
  try {
    console.log(`[EF saveSetlistSongs] Processing ${songs.length} songs for setlist ${setlistId}`);

    const setlistSongs: Partial<SetlistSong>[] = [];
    
    for (const songData of songs) {
      // First, ensure the song exists in the songs table
      const { data: existingSong, error: findError } = await supabaseAdmin
        .from('songs')
        .select('id, name')
        .eq('artist_id', artistId)
        .ilike('name', songData.name)
        .maybeSingle();

      if (findError) {
        console.error(`[EF saveSetlistSongs] Error finding song ${songData.name}:`, findError);
        continue;
      }

      let songId;
      if (existingSong) {
        songId = existingSong.id;
      } else {
        // Create new song if it doesn't exist
        const savedSong = await saveSongToDatabase({
          name: songData.name,
          artist_id: artistId
        });
        if (!savedSong) {
          console.error(`[EF saveSetlistSongs] Failed to create song ${songData.name}`);
          continue;
        }
        songId = savedSong.id;
      }

      // Add to setlist songs array
      setlistSongs.push({
        setlist_id: setlistId,
        song_id: songId,
        name: songData.name,
        position: songData.position,
        artist_id: artistId,
        is_encore: songData.is_encore,
        info: songData.info,
        vote_count: 0
      });
    }

    if (setlistSongs.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('setlist_songs')
        .upsert(setlistSongs, {
          onConflict: 'setlist_id,position',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`[EF saveSetlistSongs] Error saving setlist songs:`, insertError);
        return false;
      }

      console.log(`[EF saveSetlistSongs] Successfully saved ${setlistSongs.length} songs to setlist ${setlistId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[EF saveSetlistSongs] Unexpected error:`, error);
    return false;
  }
}
