import { supabase } from '@/integrations/supabase/client';

export async function up() {
  try {
    // Check if table exists
    const { data: exists, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'setlists');

    if (checkError) throw checkError;
    if (exists?.length > 0) return;

    // Create setlists table
    const { error: createError } = await supabase.raw(`
      CREATE TABLE setlists (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL REFERENCES artists(id),
        show_id TEXT NOT NULL REFERENCES shows(id),
        song_order INTEGER,
        songs JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (createError) throw createError;
  } catch (error) {
    console.error('Error creating setlists table:', error);
    throw error;
  }
}

export async function down() {
  try {
    const { error: dropError } = await supabase.raw('DROP TABLE IF EXISTS setlists;');
    if (dropError) throw dropError;
  } catch (error) {
    console.error('Error dropping setlists table:', error);
    throw error;
  }
}