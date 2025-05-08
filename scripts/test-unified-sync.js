// Script to test the unified-sync-v2 Edge Function
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test artist ID - Taylor Swift on Ticketmaster
const TEST_ARTIST_TM_ID = 'K8vZ917G2_0';
const TEST_ARTIST_SPOTIFY_ID = '06HL4z0CvFAxyc27GXpf02';

async function runTest() {
  console.log('🧪 Testing unified-sync-v2 Edge Function...');
  console.log(`Using Ticketmaster ID: ${TEST_ARTIST_TM_ID}`);
  
  try {
    const startTime = Date.now();
    
    // Call the function
    const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
      body: {
        entityType: 'artist',
        ticketmasterId: TEST_ARTIST_TM_ID,
        spotifyId: TEST_ARTIST_SPOTIFY_ID
      }
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error) {
      console.error('❌ Test failed:', error.message);
      console.error(error);
      process.exit(1);
    }
    
    console.log('✅ Test succeeded!');
    console.log(`Elapsed time: ${elapsed} seconds`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Save the response to a file for reference
    fs.writeFileSync(
      path.join(process.cwd(), 'reports', 'sync-test-result.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log('Results saved to reports/sync-test-result.json');
  } catch (err) {
    console.error('❌ Test failed with an exception:', err);
    process.exit(1);
  }
}

runTest(); 