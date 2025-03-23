const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSPolicies() {
  try {
    console.log('Applying RLS policies...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20250323095500_enable_rls_policies.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying RLS policies:', error);
      process.exit(1);
    }
    
    console.log('RLS policies applied successfully!');
    
    // Verify RLS is enabled on tables
    const tables = ['venues', 'songs', 'setlists', 'shows', 'setlist_songs', 'artists'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', table)
        .eq('schemaname', 'public')
        .single();
      
      if (error) {
        console.error(`Error checking RLS for ${table}:`, error);
        continue;
      }
      
      console.log(`Table ${table} RLS enabled: ${data.rowsecurity}`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

applyRLSPolicies();