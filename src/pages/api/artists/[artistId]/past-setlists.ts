import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/integrations/supabase/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { artistId } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!artistId) {
      return res.status(400).json({ error: 'Missing required parameter: artistId' });
    }

    const supabase = createServerSupabaseClient({ req, res });

    // First, check if we have setlists in our database
    const { data: setlists, error: setlistsError } = await supabase
      .from('setlists')
      .select(`
        id,
        date,
        venue_id,
        artist_id,
        show_id,
        ticketmaster_id: external_id,
        created_at,
        updated_at,
        shows(id, name, date, venue_id, venues(id, name, city, state, country)),
        artists(id, name),
        played_setlist_songs(id, position, is_encore, info, song_id, songs(id, name))
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(limit);

    if (setlistsError) {
      console.error('Error fetching setlists from database:', setlistsError);
    }

    // If we have setlists in the database, return them
    if (setlists && setlists.length > 0) {
      console.log(`Found ${setlists.length} setlists in database for artist ${artistId}`);
      
      // Transform the data to match the expected format
      const formattedSetlists = setlists.map(setlist => ({
        id: setlist.id,
        show: setlist.shows,
        artist: setlist.artists,
        songs: setlist.played_setlist_songs?.map(song => ({
          id: song.id,
          position: song.position,
          is_encore: song.is_encore,
          info: song.info,
          song: song.songs
        })) || []
      }));

      // Trigger background sync to refresh data (fire and forget, don't block response)
      supabase.functions.invoke('sync-artist-setlists', {
        body: { artistId }
      }).catch(syncError => {
        console.error(`Background sync invocation failed for artist ${artistId} setlists:`, syncError);
        // Log error, but don't let it affect the response
      });

      return res.status(200).json(formattedSetlists);
    }

    // If no setlists in database, try to fetch from Setlist.fm via edge function
    console.log(`No setlists found in database, fetching from Setlist.fm for artist ${artistId}`);
    
    try {
      const { data: setlistFmData, error: setlistFmError } = await supabase.functions.invoke('fetch-artist-setlists', {
        body: { artistId, limit }
      });

      if (setlistFmError) {
        // Log the specific error from the function invocation
        console.error(`Error invoking fetch-artist-setlists for artist ${artistId}:`, setlistFmError);
        // Return empty array as fallback, but log the error
        return res.status(200).json([]);
      }

      if (!setlistFmData || !setlistFmData.setlists || setlistFmData.setlists.length === 0) {
        // No setlists found in Setlist.fm either
        console.log(`No setlists found via Setlist.fm function for artist ${artistId}`);
        return res.status(200).json([]);
      }

      // Return the setlists from Setlist.fm
      console.log(`Successfully fetched ${setlistFmData.setlists.length} setlists via Setlist.fm function for artist ${artistId}`);
      return res.status(200).json(setlistFmData.setlists);
    } catch (invokeError) {
      // Catch any other potential errors during invocation/processing
      console.error('Unexpected error during Setlist.fm fetch invocation:', invokeError);
      return res.status(500).json({ error: 'Failed to fetch setlists from external source' });
    }
  } catch (error) {
    console.error('Error in past-setlists API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
}
