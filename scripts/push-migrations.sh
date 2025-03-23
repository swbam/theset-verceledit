#!/bin/bash

# Script to push migrations to Supabase using the CLI

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}Starting migration process...${NC}"

# Step 1: Link to the Supabase project if not already linked
echo -e "${BLUE}Linking to Supabase project...${NC}"
npx supabase link --project-ref kzjnkqeosrycfpxjwhil

# Step 2: Push migrations with include-all flag
echo -e "${CYAN}Pushing migrations to Supabase...${NC}"
npx supabase db push --include-all

# Step 3: Check if we need to fix the vote functions
echo -e "${YELLOW}Checking if we need to fix vote functions...${NC}"

# Create a temporary file with the fixed vote functions
cat > temp_vote_functions.sql << 'EOL'
-- Fix vote functions with proper parameter naming
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
EOL

# Push the fixed vote functions
echo -e "${CYAN}Pushing fixed vote functions...${NC}"
npx supabase db push --file temp_vote_functions.sql

# Clean up
rm temp_vote_functions.sql

echo -e "${GREEN}Migration process completed!${NC}"
echo -e "${YELLOW}The database schema has been updated with:${NC}"
echo -e "${YELLOW}1. Base tables and structure${NC}"
echo -e "${YELLOW}2. Functions and indexes${NC}"
echo -e "${YELLOW}3. Top tracks table${NC}"
echo -e "${YELLOW}4. Updated setlist_songs table${NC}"
echo -e "${YELLOW}5. Fixed vote functions${NC}"