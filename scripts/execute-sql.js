import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SUPABASE_URL = 'https://kzjnkqeosrycfpxjwhil.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY4Mzc4MywiZXhwIjoyMDU4MjU5NzgzfQ.4-ITsc97-Ts7gy3e6RhjIbCf2awTWdjaG3zXCxkwJpI';

async function executeSql(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute SQL: ${error}`);
    }

    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
}

async function main() {
  try {
    // First create the exec_sql_direct function
    console.log('Creating exec_sql_direct function...');
    const setupSql = readFileSync(join(__dirname, '..', 'supabase/migrations/20250322195900_create_exec_sql_script.sql'), 'utf8');
    await executeSql(setupSql);

    // Then run the combined migrations
    console.log('Running combined migrations...');
    const migrationsSql = readFileSync(join(__dirname, '..', 'combined_migrations.sql'), 'utf8');
    const success = await executeSql(migrationsSql);

    if (success) {
      console.log('Migrations completed successfully');
      
      // Run the seed script
      console.log('Running seed script...');
      await import('./seed-data.js');
    } else {
      console.error('Failed to apply migrations');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
