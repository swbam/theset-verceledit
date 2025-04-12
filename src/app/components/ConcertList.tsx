import { useEffect, useMemo, Suspense } from 'react';
// import { useSupabaseClient } from '@supabase/auth-helpers-react'; // Incorrect import
import { supabase } from '@/integrations/supabase/client'; // Import client directly
import ConcertSkeleton from './ConcertSkeleton';
import ConcertData from './ConcertData';

const ConcertList = ({ artistId }: { artistId: string }) => {
  // const supabase = useSupabaseClient(); // Use imported client directly

  const fetchShows = useMemo(() => async () => {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        id,
        date,
        name,
        status,
        ticket_url,
        venue:venues!venue_id(
          id,
          name,
          city
        ),
        artist:artists!artist_id(id,name),
        setlists:setlists!show_id(
          id,
          date,
          played_setlist_songs(
            song_id,
            position,
            songs(
              id,
              name,
              vote_count
            )
          )
        )
      `)
      .eq('artist_id', artistId)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Show load error:', error);
      return [];
    }

    console.log('Fetched shows data:', data);
    const mappedData = data?.map(show => ({
      id: show.id,
      date: show.date,
      name: show.name,
      status: show.status ?? undefined,
      ticketUrl: show.ticket_url ?? undefined,
      venue: show.venue,
      artist: show.artist,
      setlist: show.setlists?.[0]?.played_setlist_songs
        ?.sort((a, b) => a.position - b.position)
        ?.map(item => ({
          id: item.song_id,
          title: item.songs?.name || 'Unknown',
          vote_count: item.songs?.vote_count || 0
        })) || []
    })) || [];
    console.log('Mapped shows data:', mappedData);
    return mappedData;
  }, [artistId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('show-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shows',
        filter: `artist_id=eq.${artistId}`
      }, () => fetchShows())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [artistId, supabase, fetchShows]);

  return (
    <Suspense fallback={<ConcertSkeleton />}>
      <ConcertData fetchFn={fetchShows} />
    </Suspense>
  );
};

export default ConcertList;
