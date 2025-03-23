import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment variables from ${envPath}`);
} else {
  console.warn('No .env.local file found. Using environment variables from the system.');
  dotenv.config();
}

// Check Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n=== Checking Supabase Configuration ===');
if (SUPABASE_URL) {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL is set: ${SUPABASE_URL}`);
} else {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
}

if (SUPABASE_KEY) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY is set');
} else {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
}

// Check API Keys
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SETLISTFM_API_KEY = process.env.SETLISTFM_API_KEY || process.env.SETLIST_FM_API_KEY;

console.log('\n=== Checking API Keys ===');
if (SPOTIFY_CLIENT_ID) {
  console.log('✅ SPOTIFY_CLIENT_ID is set');
} else {
  console.error('❌ SPOTIFY_CLIENT_ID is missing');
}

if (SPOTIFY_CLIENT_SECRET) {
  console.log('✅ SPOTIFY_CLIENT_SECRET is set');
} else {
  console.error('❌ SPOTIFY_CLIENT_SECRET is missing');
}

if (SETLISTFM_API_KEY) {
  console.log('✅ SETLIST_FM_API_KEY is set');
} else {
  console.warn('⚠️ SETLIST_FM_API_KEY is missing (optional for setlist data)');
}

// Check Supabase connection
if (SUPABASE_URL && SUPABASE_KEY) {
  console.log('\n=== Testing Supabase Connection ===');
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Test a simple query
    const { data, error } = await supabase
      .from('artists')
      .select('id, name')
      .limit(1);
      
    if (error) {
      console.error(`❌ Supabase connection test failed: ${error.message}`);
    } else {
      console.log('✅ Successfully connected to Supabase');
      if (data && data.length > 0) {
        console.log(`✅ Found artist in database: ${data[0].name}`);
      } else {
        console.log('ℹ️ No artists found in database yet');
      }
    }
  } catch (error) {
    console.error(`❌ Error connecting to Supabase: ${error.message}`);
  }
}

console.log('\n=== Environment Check Complete ===');
console.log('To run the full sync script:');
console.log('1. Make sure all required environment variables are set in .env.local');
console.log('2. Run: node scripts/sync-data.js');