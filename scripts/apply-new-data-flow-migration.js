/**
 * This script applies the new data flow optimization migration to Supabase
 */
const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Configuration
const MIGRATION_FILE = '20250323210000_optimize_for_new_data_flow.sql';
const MIGRATION_PATH = path.join('supabase', 'migrations', MIGRATION_FILE);

// Check if the migration file exists
if (!existsSync(MIGRATION_PATH)) {
  console.error(`❌ Migration file not found: ${MIGRATION_PATH}`);
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying new data flow optimization migration...');
  
  try {
    // Load environment variables from .env file if it exists
    if (existsSync('.env')) {
      require('dotenv').config();
    }
    
    // Check for required environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_URL'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);
    if (missingEnvVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
      console.error('Please set these variables in your .env file or environment');
      process.exit(1);
    }
    
    console.log('📄 Reading migration file...');
    const migrationSQL = require('fs').readFileSync(MIGRATION_PATH, 'utf8');
    
    console.log('🔄 Applying migration to Supabase...');
    
    // Option 1: Using psql (if available)
    try {
      console.log('Attempting to use psql...');
      execSync(`psql "${process.env.SUPABASE_DB_URL}" -c "${migrationSQL.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit'
      });
      console.log('✅ Migration applied successfully using psql');
      return;
    } catch (psqlError) {
      console.warn('⚠️ Could not apply migration using psql:', psqlError.message);
      console.log('Trying alternative method...');
    }
    
    // Option 2: Using Supabase Management API
    try {
      console.log('Using Supabase Management API...');
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Execute the SQL using Postgres extension
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: migrationSQL
      });
      
      if (error) {
        console.error('❌ Error applying migration via Supabase API:', error);
        throw error;
      }
      
      console.log('✅ Migration applied successfully using Supabase API');
    } catch (apiError) {
      console.error('❌ Failed to apply migration using Supabase API:', apiError);
      console.error('Please run this SQL manually against your Supabase database');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
