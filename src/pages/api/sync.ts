import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type SyncOperation = 'artist' | 'venue' | 'show' | 'setlist' | 'cascade_sync';

interface SyncRequest extends NextApiRequest {
  body: {
    operation: SyncOperation;
    entityId?: string;
    venueId?: string;
    artistId?: string;
    showId?: string;
    setlistId?: string;
  };
}

type SyncResponse = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};

// Create Supabase client with service role key for admin operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function syncArtist(artistId: string): Promise<SyncResponse> {
  try {
    console.log(`[API] Syncing artist ${artistId}`);
    const { data, error } = await adminSupabase.functions.invoke('sync-artist', {
      body: { artistId }
    });

    if (error) {
      console.error(`[API] Error syncing artist ${artistId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API] Exception syncing artist ${artistId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function syncVenue(venueId: string): Promise<SyncResponse> {
  try {
    console.log(`[API] Syncing venue ${venueId}`);
    const { data, error } = await adminSupabase.functions.invoke('sync-venue', {
      body: { venueId }
    });

    if (error) {
      console.error(`[API] Error syncing venue ${venueId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API] Exception syncing venue ${venueId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function syncShow(showId: string): Promise<SyncResponse> {
  try {
    console.log(`[API] Syncing show ${showId}`);
    const { data, error } = await adminSupabase.functions.invoke('sync-show', {
      body: { showId }
    });

    if (error) {
      console.error(`[API] Error syncing show ${showId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API] Exception syncing show ${showId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function syncVenueShows(venueId: string): Promise<SyncResponse> {
  try {
    console.log(`[API] Syncing shows for venue ${venueId}`);
    const { data, error } = await adminSupabase.functions.invoke('sync-show', {
      body: { venueId, operation: 'venue_shows' }
    });

    if (error) {
      console.error(`[API] Error syncing shows for venue ${venueId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API] Exception syncing shows for venue ${venueId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function syncSetlist(setlistId: string): Promise<SyncResponse> {
  try {
    console.log(`[API] Syncing setlist ${setlistId}`);
    const { data, error } = await adminSupabase.functions.invoke('sync-setlist', {
      body: { setlistId }
    });

    if (error) {
      console.error(`[API] Error syncing setlist ${setlistId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API] Exception syncing setlist ${setlistId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function cascadeSync(req: SyncRequest): Promise<SyncResponse> {
  const { venueId, artistId } = req.body;
  
  if (venueId) {
    // Venue cascade: venue -> shows -> artists -> setlists
    console.log(`[API] Starting cascade sync for venue ${venueId}`);
    
    // 1. Sync venue
    const venueResult = await syncVenue(venueId);
    if (!venueResult.success) {
      return { success: false, error: `Venue sync failed: ${venueResult.error}`, data: { venue: venueResult } };
    }
    
    // 2. Sync venue shows
    const showsResult = await syncVenueShows(venueId);
    
    return {
      success: true,
      data: {
        venue: venueResult.data,
        shows: showsResult.data
      },
      message: `Successfully cascaded sync for venue ${venueId}`
    };
  } else if (artistId) {
    // Artist cascade: artist -> shows -> setlists
    console.log(`[API] Starting cascade sync for artist ${artistId}`);
    
    // 1. Sync artist
    const artistResult = await syncArtist(artistId);
    if (!artistResult.success) {
      return { success: false, error: `Artist sync failed: ${artistResult.error}`, data: { artist: artistResult } };
    }
    
    return {
      success: true,
      data: {
        artist: artistResult.data
      },
      message: `Successfully cascaded sync for artist ${artistId}`
    };
  } else {
    return { success: false, error: 'Missing required id for cascade sync (venueId or artistId)' };
  }
}

export default async function handler(req: SyncRequest, res: NextApiResponse<SyncResponse>) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { operation, entityId, artistId, venueId, showId, setlistId } = req.body;

    // Validate request
    if (!operation) {
      return res.status(400).json({ success: false, error: 'Missing operation' });
    }

    let result: SyncResponse;

    // Route to appropriate handler based on operation
    switch (operation) {
      case 'artist':
        if (!artistId) {
          return res.status(400).json({ success: false, error: 'Missing artistId' });
        }
        result = await syncArtist(artistId);
        break;

      case 'venue':
        if (!venueId) {
          return res.status(400).json({ success: false, error: 'Missing venueId' });
        }
        result = await syncVenue(venueId);
        break;

      case 'show':
        if (!showId) {
          return res.status(400).json({ success: false, error: 'Missing showId' });
        }
        result = await syncShow(showId);
        break;

      case 'setlist':
        if (!setlistId) {
          return res.status(400).json({ success: false, error: 'Missing setlistId' });
        }
        result = await syncSetlist(setlistId);
        break;

      case 'cascade_sync':
        result = await cascadeSync(req);
        break;

      default:
        return res.status(400).json({ success: false, error: `Unknown operation: ${operation}` });
    }

    return res.status(result.success ? 200 : 500).json(result);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API] Unhandled exception in sync API:', errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
