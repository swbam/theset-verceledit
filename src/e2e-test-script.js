/**
 * End-to-End Test Script for Concert Setlist Voting App
 * 
 * This script tests the complete flow of the application:
 * 1. Connects to Supabase to verify connectivity
 * 2. Tests retrieving artists from the database
 * 3. Tests retrieving a specific show
 * 4. Simulates the user journey (can be run in a browser environment)
 * 
 * Run using: node src/e2e-test-script.js
 */

// Import required libraries
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up Supabase client with environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://kzjnkqeosrycfpxjwhil.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hardcoded credentials as fallback (same as defined in environment)
console.log('Using Supabase URL:', SUPABASE_URL);

// Helper function to log test results
function logResult(testName, success, details = null) {
  console.log(`\n${success ? '✅' : '❌'} ${testName}`);
  if (details) {
    console.log(details);
  }
}

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test 1: Verify connection to Supabase
 */
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('artists').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    logResult('Supabase Connection Test', true, 'Successfully connected to Supabase');
    return true;
  } catch (error) {
    logResult('Supabase Connection Test', false, `Error connecting to Supabase: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Get all artists
 */
async function testGetArtists() {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      logResult('Fetch Artists Test', false, 'No artists found in the database');
      return null;
    }
    
    logResult('Fetch Artists Test', true, `Found ${data.length} artists`);
    console.log('First artist:', data[0].name);
    return data[0]; // Return the first artist for the next test
  } catch (error) {
    logResult('Fetch Artists Test', false, `Error fetching artists: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: Get shows for a specific artist
 */
async function testGetArtistShows(artistId) {
  if (!artistId) {
    logResult('Fetch Artist Shows Test', false, 'No artist ID provided');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .eq('artist_id', artistId)
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      logResult('Fetch Artist Shows Test', false, 'No shows found for this artist');
      return null;
    }
    
    logResult('Fetch Artist Shows Test', true, `Found ${data.length} shows for artist`);
    console.log('First show:', data[0].name, 'on', new Date(data[0].date).toLocaleDateString());
    return data[0]; // Return the first show for the next test
  } catch (error) {
    logResult('Fetch Artist Shows Test', false, `Error fetching shows: ${error.message}`);
    return null;
  }
}

/**
 * Test 4: Get setlist for a specific show
 */
async function testGetSetlist(showId) {
  if (!showId) {
    logResult('Fetch Setlist Test', false, 'No show ID provided');
    return null;
  }
  
  try {
    // First get the setlist_id from the show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('setlist_id')
      .eq('id', showId)
      .single();
    
    if (showError || !show || !show.setlist_id) {
      logResult('Fetch Setlist Test', false, 'No setlist ID found for this show');
      return null;
    }
    
    // Now get the setlist
    const { data: setlist, error: setlistError } = await supabase
      .from('setlists')
      .select('*')
      .eq('id', show.setlist_id)
      .single();
    
    if (setlistError) {
      throw setlistError;
    }
    
    logResult('Fetch Setlist Test', true, 'Successfully fetched setlist for show');
    console.log('Setlist songs count:', setlist.songs ? setlist.songs.length : 0);
    return setlist;
  } catch (error) {
    logResult('Fetch Setlist Test', false, `Error fetching setlist: ${error.message}`);
    return null;
  }
}

/**
 * Test 5: Test the sync system by triggering a sync operation
 */
async function testSyncSystem() {
  try {
    // Check if we have any entries in the sync_states table
    const { data: syncStates, error: syncError } = await supabase
      .from('sync_states')
      .select('count(*)', { count: 'exact', head: true });
    
    logResult('Sync System Test', !syncError, 
      syncError 
        ? `Error checking sync states: ${syncError.message}` 
        : `Sync states count: ${syncStates.count}`
    );
    
    return !syncError;
  } catch (error) {
    logResult('Sync System Test', false, `Error testing sync system: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('=========================================');
  console.log('🎵 CONCERT SETLIST VOTING APP E2E TESTS 🎵');
  console.log('=========================================\n');
  
  // Test 1: Verify connection
  const connectionSuccess = await testSupabaseConnection();
  if (!connectionSuccess) {
    console.log('\n❌ CONNECTION FAILED - ABORTING FURTHER TESTS');
    return;
  }
  
  // Test 2: Get artists
  const firstArtist = await testGetArtists();
  
  // Test 3: Get shows for the first artist
  let firstShow = null;
  if (firstArtist && firstArtist.id) {
    firstShow = await testGetArtistShows(firstArtist.id);
  }
  
  // Test 4: Get setlist for the first show
  if (firstShow && firstShow.id) {
    await testGetSetlist(firstShow.id);
  }
  
  // Test 5: Test sync system
  await testSyncSystem();
  
  console.log('\n=========================================');
  console.log('🎵 E2E TEST SUMMARY');
  console.log('=========================================');
  console.log(`
Test completed. 

Next steps:
1. Launch the application: pnpm dev
2. Navigate to http://localhost:8080
3. Browse artists and shows 
4. Verify data creation in Supabase

NOTE: For in-browser testing, open the browser console and run:
  - Test the browser UI flow using the DevTools console
  - Monitor network requests to see sync operations
  - Check for any console errors
`);
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
});
