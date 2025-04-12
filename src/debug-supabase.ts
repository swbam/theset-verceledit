import { createClient } from '@supabase/supabase-js';

// Hardcoded values from .env for testing
const SUPABASE_URL = "https://kzjnkqeosrycfpxjwhil.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key:', SUPABASE_ANON_KEY ? 'Available' : 'Not Available');

// Create a minimal Supabase client for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test query to verify connection
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('artists').select('id, name').limit(1);
    
    if (error) {
      console.error('Connection Error:', error);
      return false;
    }
    
    console.log('Connection Successful!');
    console.log('Sample data:', data);
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  console.log(`Connection test ${success ? 'passed' : 'failed'}`);
});
