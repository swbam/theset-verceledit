import { supabase } from "@/integrations/supabase/client";
import { EntityType } from '@/lib/sync-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, entityType, entityId, options } = body;

    if (!entityType || !entityId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: entityType, entityId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;

    // Call appropriate Edge Function based on entity type
    switch (entityType.toLowerCase()) {
      case 'artist':
        result = await supabase.functions.invoke('sync-artist', {
          body: { 
            artistId: entityId,
            options: options || {}
          }
        });
        break;

      case 'venue':
        result = await supabase.functions.invoke('sync-venue', {
          body: { 
            venueId: entityId,
            options: options || {}
          }
        });
        break;

      case 'show':
        result = await supabase.functions.invoke('sync-show', {
          body: { 
            showId: entityId,
            options: options || {}
          }
        });
        break;

      case 'song':
        result = await supabase.functions.invoke('sync-song', {
          body: { 
            songId: entityId,
            options: options || {}
          }
        });
        break;

      case 'setlist':
        result = await supabase.functions.invoke('sync-setlist', {
          body: { 
            setlistId: entityId,
            options: options || {}
          }
        });
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported entity type: ${entityType}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!result.data?.success) {
      throw new Error(result.error?.message || `Failed to sync ${entityType} ${entityId}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result.data.data,
      message: `Successfully synced ${entityType} ${entityId}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
