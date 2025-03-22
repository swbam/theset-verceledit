import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with linked project and service role key
const supabase = createClient(
  'https://kzjnkqeosrycfpxjwhil.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90Y2NqaWxnamp6cmV4bW10bGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjE0NzY3NCwiZXhwIjoyMDU3NzIzNjc0fQ.uLLzEPKeTqS0zEZd38DLRlBMOQLdSoHZFDsH0I0TeQA'
);

// Test function to check permissions on different tables
async function testPermissions() {
  try {
    console.log('Testing permissions...');
    
    // Try to read from tables
    console.log('\nTesting READ permissions:');
    
    const tables = [
      'artists', 
      'shows', 
      'setlists', 
      'setlist_songs', 
      'votes', 
      'api_cache', 
      'error_logs'
    ];
    
    for (const table of tables) {
      console.log(`Reading from ${table}...`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.error(`Error reading from ${table}: ${error.message}`);
      } else {
        console.log(`Successfully read from ${table}: ${data.length} records`);
      }
    }
    
    // Try a simple insert and delete test on artists table
    console.log('\nTesting INSERT/DELETE permissions on artists table:');
    
    // Insert test
    const testArtist = {
      name: 'Test Artist ' + Date.now(),
      spotify_id: 'test_' + Date.now(),
      image_url: 'https://example.com/test.jpg'
    };
    
    console.log('Inserting test record...');
    const { data: insertedArtist, error: insertError } = await supabase
      .rpc('insert_artist', testArtist);
      
    if (insertError) {
      console.error(`Error inserting test record: ${insertError.message}`);
      
      // Try direct SQL
      console.log('Trying direct SQL insert...');
      const { data: sqlInsertResult, error: sqlInsertError } = await supabase
        .rpc('execute_sql', { 
          sql_query: `INSERT INTO artists (name, spotify_id, image_url) 
                     VALUES ('Test Artist SQL', 'test_sql_${Date.now()}', 'https://example.com/test.jpg') 
                     RETURNING id, name` 
        });
        
      if (sqlInsertError) {
        console.error(`Error with SQL insert: ${sqlInsertError.message}`);
      } else {
        console.log(`SQL insert successful: ${JSON.stringify(sqlInsertResult)}`);
      }
    } else {
      console.log(`Insert successful: ${JSON.stringify(insertedArtist)}`);
      
      // Delete test if insert was successful
      if (insertedArtist && insertedArtist.id) {
        console.log('Deleting test record...');
        const { error: deleteError } = await supabase
          .from('artists')
          .delete()
          .eq('id', insertedArtist.id);
          
        if (deleteError) {
          console.error(`Error deleting test record: ${deleteError.message}`);
        } else {
          console.log('Delete successful');
        }
      }
    }
    
    console.log('\nPermission tests completed.');
  } catch (error) {
    console.error('Error testing permissions:', error);
  }
}

// Run the test function
testPermissions(); 