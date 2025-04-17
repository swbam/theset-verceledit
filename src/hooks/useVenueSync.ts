import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVenueSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncVenue = useCallback(async (externalVenueId: string) => {
    if (!externalVenueId) {
      console.error('No venue ID provided for sync');
      return { success: false, error: new Error('No venue ID provided') };
    }

    setSyncing(true);
    setError(null);

    try {
      console.log(`[useVenueSync] Starting sync for venue ${externalVenueId}`);

      // 1. Sync the venue itself
      const venueResult = await supabase.functions.invoke('sync-venue', {
        body: { venueId: externalVenueId }
      });

      if (!venueResult.data?.success) {
        throw new Error(venueResult.error?.message || 'Venue sync failed');
      }

      // 2. Get venue's shows
      const showResult = await supabase.functions.invoke('sync-show', {
        body: { 
          venueId: externalVenueId,
          operation: 'venue_shows'
        }
      });

      if (!showResult.data?.success) {
        console.warn(`[useVenueSync] Shows sync failed for venue ${externalVenueId}:`, showResult.error);
      }

      console.log(`[useVenueSync] Successfully synced venue ${externalVenueId}`);
      return { success: true };

    } catch (error) {
      console.error(`[useVenueSync] Error syncing venue ${externalVenueId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(new Error(errorMessage));
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncVenue,
    syncing,
    error
  };
}
