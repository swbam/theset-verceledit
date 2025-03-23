#!/usr/bin/env node

/**
 * Script to apply the new migrations for TheSet application
 * This will apply the top_tracks table and setlist_songs updates
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const NEW_MIGRATIONS = [
  '20250323000100_update_setlist_songs.sql',
  '20240720000000_vote_functions.sql' // Re-apply vote functions to ensure they're up to date
];

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
 * Apply a single migration file
 */
function applyMigration(migrationFile) {
  const fullPath = path.join(MIGRATIONS_DIR, migrationFile);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.error(`${colors.red}Migration file not found: ${fullPath}${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.cyan}Applying migration: ${migrationFile}${colors.reset}`);
  
  // Read the SQL file
  const sql = fs.readFileSync(fullPath, 'utf8');
  
  // Create a temporary file with the SQL
  const tempFile = path.join(__dirname, `temp_${Date.now()}.sql`);
  fs.writeFileSync(tempFile, sql);
  
  // Execute the SQL using the execute-sql.js script
  const result = execute(`node ${path.join(__dirname, 'execute-sql.js')} ${tempFile}`);
  
  // Clean up the temporary file
  fs.unlinkSync(tempFile);
  
  if (result.success) {
    console.log(`${colors.green}Successfully applied migration: ${migrationFile}${colors.reset}`);
    return true;
  } else {
    console.error(`${colors.red}Failed to apply migration: ${migrationFile}${colors.reset}`);
    console.error(result.stderr || result.error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.magenta}Starting migration process...${colors.reset}`);
  
  let success = true;
  
  // Apply each migration in sequence
  for (const migration of NEW_MIGRATIONS) {
    const migrationSuccess = applyMigration(migration);
    if (!migrationSuccess) {
      success = false;
      break;
    }
  }
  
  if (success) {
    console.log(`${colors.green}All migrations applied successfully!${colors.reset}`);
    console.log(`${colors.yellow}The database schema has been updated with:${colors.reset}`);
    console.log(`${colors.yellow}1. Updated setlist_songs table with additional columns${colors.reset}`);
    console.log(`${colors.yellow}2. Updated vote functions to properly handle setlist songs${colors.reset}`);
  } else {
    console.error(`${colors.red}Migration process failed. Please check the errors above.${colors.reset}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
