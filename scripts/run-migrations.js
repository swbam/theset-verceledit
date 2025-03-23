import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  "https://kzjnkqeosrycfpxjwhil.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY4Mzc4MywiZXhwIjoyMDU4MjU5NzgzfQ.4-ITsc97-Ts7gy3e6RhjIbCf2awTWdjaG3zXCxkwJpI"
);

async function runMigrations() {
  try {
    console.log('Reading migrations file...');
    const sql = readFileSync(join(__dirname, '..', 'combined_migrations.sql'), 'utf8');

    console.log('Executing migrations...');
    const { data, error } = await supabase.rpc('exec_sql_script', { sql });

    if (error) {
      console.error('Error running migrations:', error);
      process.exit(1);
    }

    console.log('Migrations completed successfully');
    
    // Run the seed script after migrations
    console.log('Running seed script...');
    await import('./seed-data.js');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
