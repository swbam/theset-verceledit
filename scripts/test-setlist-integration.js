#!/usr/bin/env node

/**
 * Test script to verify the setlist integration fixes
 * This script tests the full flow from artist search to setlist creation and voting
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
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

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Log a message with a timestamp
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Test the full integration flow
 */
async function testIntegration() {
  log('Starting integration test...', colors.magenta);
  
  // Step 1: Create a test artist
  const testArtist = {
    name: `Test Artist ${Date.now()}`,
    spotify_id: `test_spotify_${Date.now()}`,
    image_url: 'https://example.com/image.jpg',
    popularity: 80,
    genres: ['rock', 'pop'],
    updated_at: new Date().toISOString()
  };
  
  log(`Creating test artist: ${testArtist.name}`, colors.blue);
  
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .insert(testArtist)
    .select()
    .single();
    
  if (artistError) {
    log(`Failed to create artist: ${artistError.message}`, colors.red);
    return false;
  }
  
  log(`Created artist with ID: ${artist.id}`, colors.green);
  
  // Step 2: Create a test show
  const testShow = {
    name: `Test Show ${Date.now()}`,
    artist_id: artist.id,
    date: new Date().toISOString(),
    venue: 'Test Venue',
    city: 'Test City, Test Country',
    updated_at: new Date().toISOString()
  };
  
  log(`Creating test show for artist: ${artist.name}`, colors.blue);
  
  const { data: show, error: showError } = await supabase
    .from('shows')
    .insert(testShow)
    .select()
    .single();
    
  if (showError) {
    log(`Failed to create show: ${showError.message}`, colors.red);
    return false;
  }
  
  log(`Created show with ID: ${show.id}`, colors.green);
  
  // Step 3: Create a setlist for the show
  const testSetlist = {
    artist_id: artist.id,
    show_id: show.id,
    date: new Date().toISOString(),
    venue: 'Test Venue',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  log(`Creating test setlist for show: ${show.id}`, colors.blue);
  
  const { data: setlist, error: setlistError } = await supabase
    .from('setlists')
    .insert(testSetlist)
    .select()
    .single();
    
  if (setlistError) {
    log(`Failed to create setlist: ${setlistError.message}`, colors.red);
    return false;
  }
  
  log(`Created setlist with ID: ${setlist.id}`, colors.green);
  
  // Step 4: Create test songs
  const testSongs = [];
  for (let i = 1; i <= 5; i++) {
    testSongs.push({
      name: `Test Song ${i}`,
      artist_id: artist.id,
      spotify_id: `test_song_${Date.now()}_${i}`,
      duration_ms: 180000 + (i * 10000),
      popularity: 70 + i,
      preview_url: `https://example.com/preview_${i}.mp3`,
      updated_at: new Date().toISOString()
    });
  }
  
  log(`Creating ${testSongs.length} test songs`, colors.blue);
  
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .insert(testSongs)
    .select();
    
  if (songsError) {
    log(`Failed to create songs: ${songsError.message}`, colors.red);
    return false;
  }
  
  log(`Created ${songs.length} songs`, colors.green);
  
  // Step 5: Add songs to the setlist
  const setlistSongs = [];
  for (let i = 0; i < songs.length; i++) {
    setlistSongs.push({
      setlist_id: setlist.id,
      song_id: songs[i].id,
      name: songs[i].name,
      artist_id: artist.id,
      position: i + 1,
      vote_count: 0,
      updated_at: new Date().toISOString()
    });
  }
  
  log(`Adding ${setlistSongs.length} songs to setlist`, colors.blue);
  
  const { data: addedSongs, error: addSongsError } = await supabase
    .from('setlist_songs')
    .insert(setlistSongs)
    .select();
    
  if (addSongsError) {
    log(`Failed to add songs to setlist: ${addSongsError.message}`, colors.red);
    return false;
  }
  
  log(`Added ${addedSongs.length} songs to setlist`, colors.green);
  
  // Step 6: Test voting on a setlist song
  const testSetlistSong = addedSongs[0];
  const testUserId = 'test-user-' + Date.now();
  
  log(`Testing vote on setlist song: ${testSetlistSong.id}`, colors.blue);
  
  // Call the increment_vote function
  const { error: voteError } = await supabase.rpc('increment_vote', {
    p_song_id: testSetlistSong.id,
    p_user_id: testUserId
  });
  
  if (voteError) {
    log(`Failed to vote on song: ${voteError.message}`, colors.red);
    return false;
  }
  
  // Verify the vote was recorded
  const { data: updatedSong, error: fetchError } = await supabase
    .from('setlist_songs')
    .select('id, name, vote_count')
    .eq('id', testSetlistSong.id)
    .single();
    
  if (fetchError) {
    log(`Failed to fetch updated song: ${fetchError.message}`, colors.red);
    return false;
  }
  
  if (updatedSong.vote_count !== 1) {
    log(`Vote count not updated correctly. Expected 1, got ${updatedSong.vote_count}`, colors.red);
    return false;
  }
  
  log(`Successfully voted on song. Vote count: ${updatedSong.vote_count}`, colors.green);
  
  // Step 7: Verify the vote record was created
  const { data: voteRecord, error: voteRecordError } = await supabase
    .from('votes')
    .select('*')
    .eq('song_id', testSetlistSong.id)
    .eq('user_id', testUserId)
    .single();
    
  if (voteRecordError) {
    log(`Failed to fetch vote record: ${voteRecordError.message}`, colors.red);
    return false;
  }
  
  log(`Vote record created successfully: ${JSON.stringify(voteRecord)}`, colors.green);
  
  // All tests passed
  log('All integration tests passed successfully!', colors.magenta);
  
  // Clean up test data (optional)
  if (process.env.KEEP_TEST_DATA !== 'true') {
    log('Cleaning up test data...', colors.yellow);
    
    // Delete in reverse order of creation to avoid foreign key constraints
    await supabase.from('votes').delete().eq('song_id', testSetlistSong.id);
    await supabase.from('setlist_songs').delete().eq('setlist_id', setlist.id);
    await supabase.from('setlists').delete().eq('id', setlist.id);
    await supabase.from('songs').delete().eq('artist_id', artist.id);
    await supabase.from('shows').delete().eq('id', show.id);
    await supabase.from('artists').delete().eq('id', artist.id);
    
    log('Test data cleaned up', colors.green);
  }
  
  return true;
}

// Run the test
testIntegration()
  .then(success => {
    if (success) {
      log('Integration test completed successfully', colors.green);
      process.exit(0);
    } else {
      log('Integration test failed', colors.red);
      process.exit(1);
    }
  })
  .catch(error => {
    log(`Unhandled error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  });