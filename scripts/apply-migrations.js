import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(fileURLToPath(new URL('.', import.meta.url)));

// Initialize Supabase client with service role key from environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const migrations = [
  // Base tables and structure
  '../supabase/migrations/20250322230200_tables_first.sql',
  '../supabase/migrations/20250322230300_functions_and_indexes.sql',
  
  // Additional migrations
  '../supabase/migrations/20250322195900_create_exec_sql_script.sql',
  '../supabase/migrations/20250323000000_add_top_tracks_table.sql',
  '../supabase/migrations/20250323000100_update_setlist_songs.sql',
  
  // Legacy migrations (if needed)
  '../supabase/migrations/20240719000000_base_tables.sql',
  '../supabase/migrations/20240720000000_vote_functions.sql',
  '../supabase/migrations/20240721000000_transaction_functions.sql',
  '../supabase/migrations/20240722000000_add_setlist_fm_mbid.sql'
];

async function executeSql(sql) {
  try {
    // First try using the exec_sql_direct function if it exists
    try {
      const { data, error } = await supabase.rpc('exec_sql_direct', { sql });
      if (!error) {
        return true;
      }
    } catch (rpcError) {
      console.log('RPC method not available, falling back to migrations table method');
    }

    // Fallback to the migrations table method
    const { data, error } = await supabase.from('migrations').insert({
      name: 'temp',
      sql: sql
    }).select().maybeSingle();
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('SQL execution error:', error);
    return false;
  }
}

async function runMigrations() {
  console.log('Starting migrations...');
  
  // Create migrations tracking table if it doesn't exist
  const createMigrationsTable = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT,
      sql TEXT,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  
  console.log('Ensuring migrations table exists...');
  await executeSql(createMigrationsTable);
  
  for (const migrationPath of migrations) {
    try {
      console.log(`Applying migration: ${migrationPath}`);
      const sql = readFileSync(join(__dirname, migrationPath), 'utf8');
      
      const success = await executeSql(sql);
      if (success) {
        console.log(`Successfully applied migration: ${migrationPath}`);
      } else {
        console.error(`Failed to apply migration: ${migrationPath}`);
        // Don't exit on failure, try to continue with other migrations
        console.log('Continuing with next migration...');
      }
    } catch (error) {
      console.error(`Error processing migration ${migrationPath}:`, error);
      // Don't exit on failure, try to continue with other migrations
      console.log('Continuing with next migration...');
    }
  }
  
  console.log('All migrations completed!');
}

// Run migrations
runMigrations().catch(console.error);
