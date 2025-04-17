import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying setlist migration...');
    
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250417165400_update_setlists.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    const { error } = await supabase.rpc('exec_sql', {
      query: migrationSql
    });

    if (error) {
      throw error;
    }

    console.log('Migration applied successfully');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();