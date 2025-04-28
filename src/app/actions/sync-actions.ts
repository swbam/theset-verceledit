'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Synchronizes an artist's data, including shows, songs, and other information.
 * Uses the unified sync endpoint to update all related data.
 */
export async function syncArtist(artistId: string): Promise<void> {
  try {
    // Create a Supabase client for server actions
    const supabase = createServerActionClient({ cookies });
    
    // Use the unified sync endpoint to update artist data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/unified-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'artist',
        entityId: artistId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error syncing artist:', errorData);
      throw new Error(`Failed to sync artist: ${response.statusText}`);
    }

    // Optional: Log success
    console.log(`Successfully synced artist ${artistId}`);
  } catch (error) {
    console.error('Error in syncArtist:', error);
    throw error;
  }
}

/**
 * Synchronizes a show's data, including setlists and other information.
 */
export async function syncShow(showId: string): Promise<void> {
  try {
    // Create a Supabase client for server actions
    const supabase = createServerActionClient({ cookies });
    
    // Use the unified sync endpoint to update show data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/unified-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'show',
        entityId: showId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error syncing show:', errorData);
      throw new Error(`Failed to sync show: ${response.statusText}`);
    }

    // Optional: Log success
    console.log(`Successfully synced show ${showId}`);
  } catch (error) {
    console.error('Error in syncShow:', error);
    throw error;
  }
} 