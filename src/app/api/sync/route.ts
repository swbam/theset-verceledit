import { supabase } from "@/integrations/supabase/client";
import { EntityType } from '@/lib/sync-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, id, operation = 'create' } = body;

    if (!type || !id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: type, id'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate entity type
    const entityType = type as EntityType;
    if (!Object.values(EntityType).includes(entityType)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid entity type: ${type}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;

    // Call appropriate Edge Function based on entity type
    switch (entityType) {
      case EntityType.Artist:
        result = await supabase.functions.invoke('sync-artist', {
          body: { artistId: id }
        });
        break;

      case EntityType.Venue:
        result = await supabase.functions.invoke('sync-venue', {
          body: { venueId: id }
        });
        break;

      case EntityType.Show:
        result = await supabase.functions.invoke('sync-show', {
          body: { showId: id }
        });
        break;

      case EntityType.Song:
        // Check if this is a songId or an artistId based on format
        // Artist IDs from Ticketmaster are typically non-UUIDs
        const isSongId = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        if (isSongId) {
          // This is an individual song
          result = await supabase.functions.invoke('sync-song', {
            body: { songId: id }
          });
        } else {
          // This is likely an artist ID - get artist details first
          const { data: artist } = await supabase
            .from('artists')
            .select('name')
            .eq('id', id)
            .maybeSingle();
            
          result = await supabase.functions.invoke('sync-song', {
            body: { 
              artistId: id,
              artistName: artist?.name || 'Unknown Artist'
            }
          });
        }
        break;

      case EntityType.Setlist:
        result = await supabase.functions.invoke('sync-setlist', {
          body: { setlistId: id }
        });
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported entity type: ${type}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!result.data?.success) {
      throw new Error(result.error?.message || `Failed to sync ${type} ${id}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully synced ${type} ${id}`,
      data: result.data
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API/sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Sync operation failed',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
