import { useEffect, useMemo, Suspense } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ConcertSkeleton from './ConcertSkeleton';
import ConcertData from './ConcertData';

const ConcertList = ({ artistId }: { artistId: string }) => {
  const supabase = useSupabaseClient();

  const fetchConcerts = useMemo(() => async () => {
    const { data, error } = await supabase
      .from('concerts')
      .select(`
        id,
        date,
        venue,
        setlist:songs!setlist_id(
          id,
          title,
          vote_count
        ),
        artist:artists!artist_id(id,name)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Concert load error:', error);
      return [];
    }

    return data;
  }, [artistId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('concert-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'concerts',
        filter: `artist_id=eq.${artistId}`
      }, () => fetchConcerts())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [artistId, supabase, fetchConcerts]);

  return (
    <Suspense fallback={<ConcertSkeleton />}>
      <ConcertData fetchFn={fetchConcerts} />
    </Suspense>
  );
};

export default ConcertList; 