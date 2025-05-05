import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js'; // Import createClient directly
import { corsHeaders } from '@/lib/api-helpers'; // Assuming corsHeaders exist

interface SyncRequestBody {
  entityType: 'artist'; // Currently only supporting artist
  entityId?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'ok' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { entityType, entityId, ticketmasterId, spotifyId, options } = req.body as SyncRequestBody;

    // Basic validation
    if (entityType !== 'artist') {
      return res.status(400).json({ error: 'Invalid entityType. Only "artist" is supported.' });
    }
    if (!entityId && !ticketmasterId) {
      return res.status(400).json({ error: 'Either entityId or ticketmasterId is required.' });
    }

    // Create a separate admin client with the service role key to invoke functions
    // Ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`[API /artists/sync] Received sync request for ${entityType}:`, { entityId, ticketmasterId, spotifyId });

    // Invoke the Supabase Edge Function using the *admin* client
    const { data, error } = await supabaseAdmin.functions.invoke('unified-sync-v2', {
      body: {
        entityType,
        entityId, // Pass the internal UUID if available
        ticketmasterId,
        spotifyId,
        options,
      },
    });

    if (error) {
      console.error(`[API /artists/sync] Error invoking unified-sync-v2:`, error);
      // Attempt to parse Supabase function error details
      let statusCode = 500;
      let message = 'Failed to invoke sync function.';
      if (error instanceof Error && 'context' in error) {
         const context = (error as any).context;
         statusCode = context?.status ?? 500;
         message = context?.message ?? error.message;
      } else if (error instanceof Error) {
         message = error.message;
      }
      return res.status(statusCode).json({ error: message, details: error });
    }

    console.log(`[API /artists/sync] Sync function invoked successfully:`, data);
    return res.status(200).json(data);

  } catch (error) {
    console.error('[API /artists/sync] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return res.status(500).json({ error: 'Internal Server Error', details: message });
  }
}