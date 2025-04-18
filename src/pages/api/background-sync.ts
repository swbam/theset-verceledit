import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type SyncOperation = 'start' | 'process' | 'status' | 'retry_failed';

interface BackgroundSyncRequest extends NextApiRequest {
  body: {
    operation: SyncOperation;
    entityType?: 'artist' | 'venue' | 'show' | 'setlist' | 'song';
    entityId?: string;
    limit?: number;
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

export default async function handler(req: BackgroundSyncRequest, res: NextApiResponse<SyncResponse>) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('[API] Background sync request:', req.body);
    const { operation, entityType, entityId, limit } = req.body;

    // Validate request
    if (!operation) {
      return res.status(400).json({ success: false, error: 'Missing operation' });
    }

    // Call the orchestrate-sync edge function
    const { data, error } = await adminSupabase.functions.invoke('orchestrate-sync', {
      body: { 
        operation,
        entityType,
        entityId,
        limit 
      }
    });

    if (error) {
      console.error('[API] Error in background sync:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API] Unhandled exception in background sync API:', errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
