#!/usr/bin/env node

/**
 * Test script for Sync V2 functionality
 * 
 * Run with: node test_sync_v2.js [artist|show] [id]
 * Examples:
 *   - node test_sync_v2.js artist 123e4567-e89b-12d3-a456-426614174000
 *   - node test_sync_v2.js show 123e4567-e89b-12d3-a456-426614174001
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = 'kzjnkqeosrycfpxjwhil';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.');
  process.exit(1);
}

// Parse command line arguments
const entityType = process.argv[2]?.toLowerCase();
const entityId = process.argv[3];

if (!entityType || !['artist', 'show'].includes(entityType) || !entityId) {
  console.error('Usage: node test_sync_v2.js [artist|show] [id]');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`Testing Sync V2 for ${entityType} with ID: ${entityId}`);

  try {
    // Call the Edge Function directly
    console.log(`Invoking unified-sync-v2 Edge Function...`);
    const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
      body: {
        entityType,
        entityId,
        options: {
          forceRefresh: true
        }
      }
    });

    if (error) {
      console.error('Error invoking Edge Function:', error.message);
      process.exit(1);
    }

    console.log(`Sync completed successfully!`);
    console.log('Response:', JSON.stringify(data, null, 2));

    // Query the entity to verify sync status
    const { data: entityData, error: entityError } = await supabase
      .from(entityType === 'artist' ? 'artists' : 'shows')
      .select('*')
      .eq('id', entityId)
      .single();

    if (entityError) {
      console.error(`Error fetching ${entityType} data:`, entityError.message);
    } else {
      console.log(`\n${entityType.charAt(0).toUpperCase() + entityType.slice(1)} data after sync:`);
      console.log(JSON.stringify({
        id: entityData.id,
        name: entityData.name,
        sync_status: entityData.sync_status,
        last_sync: entityData.last_sync,
        last_sync_error: entityData.last_sync_error,
        ...(entityType === 'show' ? { 
          setlist_suggestions_count: Array.isArray(entityData.setlist_suggestions) 
            ? entityData.setlist_suggestions.length 
            : 0 
        } : {
          upcoming_shows_count: entityData.upcoming_shows_count,
          stored_songs_count: Array.isArray(entityData.stored_songs) 
            ? entityData.stored_songs.length 
            : 0
        })
      }, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main(); 