#!/usr/bin/env node

/**
 * Script to run the combined migrations using the Supabase CLI
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Execute a command and return the output
 */
function execute(command) {
  try {
    console.log(`${colors.blue}Executing: ${command}${colors.reset}`);
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.magenta}Starting migration process...${colors.reset}`);
  
  // Run the combined migrations
  console.log(`${colors.cyan}Applying combined migrations...${colors.reset}`);
  
  // Use the Supabase CLI to run the migrations
  const result = execute(`npx supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres`);
  
  if (result.success) {
    console.log(`${colors.green}Successfully applied migrations!${colors.reset}`);
    console.log(`${colors.yellow}The database schema has been updated with:${colors.reset}`);
    console.log(`${colors.yellow}1. New top_tracks table for storing artist's top tracks${colors.reset}`);
    console.log(`${colors.yellow}2. Updated setlist_songs table with additional columns${colors.reset}`);
    console.log(`${colors.yellow}3. Fixed vote functions with proper parameter naming${colors.reset}`);
  } else {
    console.error(`${colors.red}Migration process failed:${colors.reset}`);
    console.error(result.stderr || result.error);
    
    // Fallback to manual SQL execution
    console.log(`${colors.yellow}Attempting fallback method...${colors.reset}`);
    
    // Try using psql directly
    const psqlResult = execute(`psql -h localhost -p 54322 -U postgres -d postgres -f ${path.join(__dirname, '../combined_migrations.sql')}`);
    
    if (psqlResult.success) {
      console.log(`${colors.green}Successfully applied migrations using fallback method!${colors.reset}`);
    } else {
      console.error(`${colors.red}Fallback method failed:${colors.reset}`);
      console.error(psqlResult.stderr || psqlResult.error);
      process.exit(1);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});