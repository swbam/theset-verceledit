import { supabase } from "@/integrations/supabase/client";

export async function GET(
  request: Request,
  { params }: { params: { artistId: string } }
) {
  try {
    const { artistId } = params;

    if (!artistId) {
      return Response.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    // Get artist details first
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name, setlist_fm_mbid')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      console.error(`[past-setlists] Error fetching artist ${artistId}:`, artistError);
      return Response.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Sync setlists using Edge Function
    const result = await supabase.functions.invoke('sync-setlist', {
      body: { 
        artistId: artist.id,
        artistName: artist.name,
        mbid: artist.setlist_fm_mbid
      }
    });

    if (!result.data?.success) {
      throw new Error(result.error?.message || 'Failed to sync setlists');
    }

    // Get synced setlists from database
    const { data: setlists, error: setlistError } = await supabase
      .from('setlists')
      .select(`
        *,
        songs:setlist_songs(*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false });

    if (setlistError) {
      console.error(`[past-setlists] Error fetching setlists:`, setlistError);
      throw setlistError;
    }

    return Response.json({
      success: true,
      data: setlists || []
    });

  } catch (error) {
    console.error('[past-setlists] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({
      success: false,
      error: 'Failed to fetch past setlists',
      details: errorMessage
    }, {
      status: 500
    });
  }
}
