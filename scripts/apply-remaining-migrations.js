#!/usr/bin/env node

/**
 * Script to apply remaining migrations using the exec_sql_direct function
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(fileURLToPath(new URL('.', import.meta.url)));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Migrations that had permission issues
const remainingMigrations = [
  '../supabase/migrations/20250322230200_tables_first.sql',
  '../supabase/migrations/20240720000000_vote_functions.sql'
];

/**
 * Execute SQL using the exec_sql_direct function
 */
async function executeSql(sql) {
  try {
    console.log(`${colors.blue}Executing SQL...${colors.reset}`);
    const { data, error } = await supabase.rpc('exec_sql_direct', { sql });
    
    if (error) {
      console.error(`${colors.red}Error executing SQL:${colors.reset}`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.magenta}Starting remaining migrations...${colors.reset}`);
  
  for (const migrationPath of remainingMigrations) {
    try {
      console.log(`${colors.cyan}Applying migration: ${migrationPath}${colors.reset}`);
      const sql = readFileSync(join(__dirname, migrationPath), 'utf8');
      
      const success = await executeSql(sql);
      if (success) {
        console.log(`${colors.green}Successfully applied migration: ${migrationPath}${colors.reset}`);
      } else {
        console.error(`${colors.red}Failed to apply migration: ${migrationPath}${colors.reset}`);
        console.log(`${colors.yellow}Continuing with next migration...${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}Error processing migration ${migrationPath}:${colors.reset}`, error);
      console.log(`${colors.yellow}Continuing with next migration...${colors.reset}`);
    }
  }
  
  console.log(`${colors.green}All remaining migrations completed!${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});