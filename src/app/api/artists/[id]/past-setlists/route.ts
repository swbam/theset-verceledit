import { supabase } from "@/integrations/supabase/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const artistId = params.id;
    const limit = new URL(request.url).searchParams.get('limit') || '10';

    // First try to get artist name from our database
    const { data: artist } = await supabase
      .from('artists')
      .select('name, setlist_fm_mbid')
      .eq('id', artistId)
      .single();

    if (!artist) {
      throw new Error('Artist not found');
    }

    // First try to get setlists from our database
    const { data: setlists, error: dbError } = await supabase
      .from('setlists')
      .select(`
        id,
        show:shows (
          id,
          name,
          date,
          venue:venues (
            name,
            city,
            state
          )
        ),
        songs:played_setlist_songs (
          id,
          position,
          is_encore,
          info,
          song:songs (
            id,
            name
          )
        )
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (dbError) {
      throw dbError;
    }

    // If we have setlists in our DB, return them
    if (setlists && setlists.length > 0) {
      return new Response(JSON.stringify(setlists), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If no setlists in DB, fetch from setlist.fm
    const result = await supabase.functions.invoke('fetch-past-setlists', {
      body: {
        artistId,
        artistName: artist.name,
        mbid: artist.setlist_fm_mbid
      }
    });

    if (!result.data?.success) {
      throw new Error(result.error?.message || 'Failed to fetch setlists');
    }

    return new Response(JSON.stringify(result.data.setlists || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API/past-setlists] Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch past setlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}