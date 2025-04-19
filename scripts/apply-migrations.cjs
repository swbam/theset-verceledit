// CommonJS script to apply database migrations to Supabase
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase client for running migrations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

// Directory containing migration files (default to supabase/migrations)
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  try {
    console.log('Starting database migrations...');

    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration files to process`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Applying migration: ${file}`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`Error applying migration ${file}:`, error);
        } else {
          console.log(`Successfully applied migration: ${file}`);
        }
      } catch (err) {
        console.error(`Error applying migration ${file}:`, err);
      }
    }

    console.log('Migrations completed');
  } catch (err) {
    console.error('Error running migrations:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
