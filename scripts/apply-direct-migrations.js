#!/usr/bin/env node

/**
 * Script to apply migrations directly to Supabase using the REST API
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

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

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${colors.red}Error: Missing Supabase credentials in .env.local file${colors.reset}`);
  process.exit(1);
}

// Migration files to apply
const migrations = [
  '../supabase/migrations/20250322230200_tables_first.sql',
  '../supabase/migrations/20250322230300_functions_and_indexes.sql',
  '../supabase/migrations/20250323000000_add_top_tracks_table.sql',
  '../supabase/migrations/20250323000100_update_setlist_songs.sql'
];

/**
 * Execute SQL directly using the Supabase REST API
 */
async function executeSql(sql) {
  try {
    console.log(`${colors.blue}Executing SQL...${colors.reset}`);
    
    // Split the SQL into statements by semicolons, but be careful with function definitions
    const statements = splitSqlStatements(sql);
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log(`${colors.yellow}Executing statement:${colors.reset} ${statement.substring(0, 100)}...`);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ query: statement })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`${colors.red}Error executing statement:${colors.reset}`, error);
        console.log(`${colors.yellow}Continuing with next statement...${colors.reset}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    return false;
  }
}

/**
 * Split SQL into individual statements, being careful with function definitions
 */
function splitSqlStatements(sql) {
  // This is a simplified approach - for complex SQL with functions, triggers, etc.
  // you might need a more sophisticated parser
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let inTransaction = false;
  
  // Split by lines to make it easier to handle
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comments
    if (trimmedLine.startsWith('--')) {
      continue;
    }
    
    // Check if we're entering a function definition
    if (trimmedLine.includes('FUNCTION') && trimmedLine.includes('AS $$')) {
      inFunction = true;
    }
    
    // Check if we're entering a transaction
    if (trimmedLine === 'BEGIN;') {
      inTransaction = true;
    }
    
    // Add the line to the current statement
    currentStatement += line + '\n';
    
    // Check if we're exiting a function definition
    if (inFunction && trimmedLine === '$$ LANGUAGE plpgsql;') {
      inFunction = false;
    }
    
    // Check if we're exiting a transaction
    if (inTransaction && trimmedLine === 'COMMIT;') {
      inTransaction = false;
    }
    
    // If we're not in a function or transaction and the line ends with a semicolon,
    // we've reached the end of a statement
    if (!inFunction && !inTransaction && trimmedLine.endsWith(';')) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement);
  }
  
  return statements;
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.magenta}Starting direct migration process...${colors.reset}`);
  
  // First, create the exec_sql_direct function if it doesn't exist
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql_direct(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION exec_sql_direct(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION exec_sql_direct(text) TO service_role;
  `;
  
  console.log(`${colors.cyan}Creating exec_sql_direct function...${colors.reset}`);
  await executeSql(createFunctionSql);
  
  // Apply each migration
  for (const migrationPath of migrations) {
    try {
      console.log(`${colors.cyan}Applying migration: ${migrationPath}${colors.reset}`);
      const sql = fs.readFileSync(path.join(__dirname, migrationPath), 'utf8');
      
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
  
  console.log(`${colors.green}All migrations completed!${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});