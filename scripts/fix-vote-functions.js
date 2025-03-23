#!/usr/bin/env node

/**
 * Script to fix vote functions in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Drop existing vote functions SQL
const dropFunctionsSql = `
-- Drop existing vote functions
DROP FUNCTION IF EXISTS increment_vote(uuid, uuid);
DROP FUNCTION IF EXISTS decrement_vote(uuid, uuid);
`;

// Fixed vote functions SQL
const fixedVoteFunctions = `
-- Create fixed vote functions with proper parameter naming
CREATE OR REPLACE FUNCTION increment_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
BEGIN
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) DO UPDATE
  SET count = votes.count + 1;
  
  UPDATE setlist_songs
  SET vote_count = vote_count + 1
  WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
BEGIN
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  UPDATE setlist_songs
  SET vote_count = greatest(vote_count - 1, 0)
  WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql;
`;

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
  console.log(`${colors.magenta}Fixing vote functions...${colors.reset}`);
  
  // First drop existing functions
  console.log(`${colors.cyan}Dropping existing vote functions...${colors.reset}`);
  const dropSuccess = await executeSql(dropFunctionsSql);
  
  if (!dropSuccess) {
    console.error(`${colors.red}Failed to drop existing vote functions.${colors.reset}`);
    console.log(`${colors.yellow}Continuing anyway...${colors.reset}`);
  }
  
  // Then create new functions
  console.log(`${colors.cyan}Creating new vote functions...${colors.reset}`);
  const createSuccess = await executeSql(fixedVoteFunctions);
  
  if (createSuccess) {
    console.log(`${colors.green}Successfully fixed vote functions!${colors.reset}`);
  } else {
    console.error(`${colors.red}Failed to fix vote functions.${colors.reset}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});