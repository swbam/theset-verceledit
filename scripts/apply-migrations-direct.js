#!/usr/bin/env node

/**
 * Script to directly apply the new migrations for TheSet application
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://kzjnkqeosrycfpxjwhil.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY4Mzc4MywiZXhwIjoyMDU4MjU5NzgzfQ.4-ITsc97-Ts7gy3e6RhjIbCf2awTWdjaG3zXCxkwJpI';

// Migration files to apply
const MIGRATIONS = [
  '../supabase/migrations/20250322195900_create_exec_sql_script.sql',
  '../supabase/migrations/20250323000000_add_top_tracks_table.sql',
  '../supabase/migrations/20250323000100_update_setlist_songs.sql'
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
 * Execute SQL directly against Supabase SQL API
 */
async function executeDirectSql(sql) {
  try {
    console.log(`${colors.blue}Executing SQL directly...${colors.reset}`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: sql
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to execute SQL: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}Error executing SQL:${colors.reset}`, error);
    return false;
  }
}

/**
 * Execute SQL using the exec_sql_direct function
 */
async function executeSql(sql) {
  try {
    console.log(`${colors.blue}Executing SQL via exec_sql_direct...${colors.reset}`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to execute SQL: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}Error executing SQL:${colors.reset}`, error);
    return false;
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(migrationPath, isFirst = false) {
  const fullPath = path.join(__dirname, migrationPath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.error(`${colors.red}Migration file not found: ${fullPath}${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.cyan}Applying migration: ${path.basename(migrationPath)}${colors.reset}`);
  
  // Read the SQL file
  const sql = fs.readFileSync(fullPath, 'utf8');
  
  // Execute the SQL - use direct method for first migration
  const success = isFirst 
    ? await executeDirectSql(sql)
    : await executeSql(sql);
  
  if (success) {
    console.log(`${colors.green}Successfully applied migration: ${path.basename(migrationPath)}${colors.reset}`);
    return true;
  } else {
    console.error(`${colors.red}Failed to apply migration: ${path.basename(migrationPath)}${colors.reset}`);
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
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migration = MIGRATIONS[i];
    const isFirst = i === 0; // First migration needs special handling
    
    const migrationSuccess = await applyMigration(migration, isFirst);
    if (!migrationSuccess) {
      success = false;
      break;
    }
  }
  
  if (success) {
    console.log(`${colors.green}All migrations applied successfully!${colors.reset}`);
    console.log(`${colors.yellow}The database schema has been updated with:${colors.reset}`);
    console.log(`${colors.yellow}1. New top_tracks table for storing artist's top tracks${colors.reset}`);
    console.log(`${colors.yellow}2. Updated setlist_songs table with additional columns${colors.reset}`);
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
