// CJS script to apply database migrations to Supabase
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
    }
  }
);

// Directory containing migration files
const migrationsDir = path.join(__dirname, '..', 'src', 'db-migrations');

async function main() {
  try {
    console.log('Starting database migrations...');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }
    
    // Get list of migration files in order
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // This will sort alphabetically, so naming should be like 001_xxx.sql
    
    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }
    
    console.log(`Found ${files.length} migration files to process`);
    
    // Process each migration file
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Applying migration: ${file}`);
      
      try {
        // Execute the SQL
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
          console.error(`Error applying migration ${file}:`, error);
          // Continue with other migrations
        } else {
          console.log(`Successfully applied migration: ${file}`);
        }
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        // Continue with other migrations
      }
    }
    
    console.log('Migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
