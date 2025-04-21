// CJS script to clear API cache from Supabase
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Supabase client for clearing cache
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

async function main() {
  try {
    console.log('Clearing API cache from database...');
    
    // Delete all records from the api_cache table
    const { error } = await supabase
      .from('api_cache')
      .delete()
      .neq('cache_key', 'dummy'); // Delete all records
    
    if (error) {
      console.error('Error clearing cache:', error);
      process.exit(1);
    }
    
    console.log('API cache cleared successfully!');
  } catch (error) {
    console.error('Error clearing cache:', error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 