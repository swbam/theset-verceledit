import { supabase } from "@/integrations/supabase/client";

/**
 * Migration function to create artist_songs table and transition from top_tracks
 */
export async function createArtistSongsTable() {
  console.log("Starting migration: Creating artist_songs table...");

  try {
    // Create the artist_songs table
    const { error: createError } = await supabase.rpc('create_artist_songs_table', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS artist_songs (
          id TEXT PRIMARY KEY,
          artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          album_id TEXT,
          album_name TEXT,
          album_image_url TEXT,
          release_date TEXT,
          spotify_url TEXT,
          preview_url TEXT,
          duration_ms INTEGER,
          popularity INTEGER,
          explicit BOOLEAN DEFAULT FALSE,
          track_number INTEGER,
          is_top_track BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(id, artist_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
        CREATE INDEX IF NOT EXISTS idx_artist_songs_is_top_track ON artist_songs(is_top_track);
      `
    });

    if (createError) {
      console.error("Error creating artist_songs table:", createError);
      return { success: false, error: createError };
    }

    // Migrate data from top_tracks if it exists
    const { error: migrationError } = await supabase.rpc('run_migration_query', {
      sql_query: `
        INSERT INTO artist_songs (
          id, artist_id, name, album_name, album_image_url, 
          spotify_url, preview_url, duration_ms, popularity, 
          is_top_track, last_updated
        )
        SELECT 
          id, artist_id, name, album_name, album_image_url,
          spotify_url, preview_url, duration_ms, popularity,
          TRUE as is_top_track, last_updated
        FROM top_tracks
        ON CONFLICT (id, artist_id) DO NOTHING;
      `
    });

    if (migrationError) {
      console.error("Error migrating data from top_tracks:", migrationError);
      return { success: false, error: migrationError };
    }

    console.log("Successfully created artist_songs table and migrated data");
    return { success: true };
  } catch (error) {
    console.error("Error in createArtistSongsTable:", error);
    return { success: false, error };
  }
} 