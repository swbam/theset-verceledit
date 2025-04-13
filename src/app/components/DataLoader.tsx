import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Import client directly
import { Database } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

type RealEntity = 'artists' | 'shows' | 'setlists' | 'played_setlist_songs' | 'songs' | 'venues' | 'votes';
type Entity = RealEntity | 'past_setlists';

function isRealEntity(entity: Entity): entity is RealEntity {
  return [
    'artists',
    'shows',
    'setlists',
    'played_setlist_songs',
    'songs',
    'venues',
    'votes'
  ].includes(entity as string);
}

interface DataLoaderProps {
  entity: Entity;
  limit?: number;
  filter?: Record<string, unknown>;
  children: (data: unknown[]) => React.ReactNode;
}

const SkeletonLoader = ({ type }: { type: Entity }) => {
  return (
    <div className="space-y-3">
      {[...Array(type === 'artists' ? 4 : 5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {type === 'artists' && <Skeleton className="h-12 w-12 rounded-full" />}
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
};

const DataErrorCard = ({ onRetry }: { onRetry?: () => void }) => (
  <Card className="p-4 border-red-200 bg-red-50">
    <div className="flex gap-2 items-center text-red-600">
      <AlertTriangle size={16} />
      <p>Failed to load data. Please try again.</p>
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-2" 
      onClick={onRetry || (() => window.location.reload())}
    >
      Retry
    </Button>
  </Card>
);

const DataLoader = ({ entity, limit = 50, filter = {}, children }: DataLoaderProps) => {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Special handling for past_setlists (combination of shows, setlists, and songs)
        if (entity === 'past_setlists') {
          const artistId = filter.artist_id as string; // Explicitly cast to string
          if (!artistId) {
            throw new Error('Artist ID is required for past_setlists');
          }
          
          // First get shows for this artist
          const { data: shows, error: showsError } = await supabase
            .from('shows')
            .select('id, date, venue, city')
            .eq('artist_id', artistId as string)
            .order('date', { ascending: false })
            .limit(limit);
            
          if (showsError) throw showsError;
          
          // For each show, get the setlist and songs
          // Define a type for the enriched data structure
          type EnrichedShowData = {
            id: string;
            date: string | null;
            venue: string | null;
            city: string | null;
            setlist?: { id: string } | null;
            songs: any[]; // Use a more specific type if possible
          };
          
          // Define the show type to match the database schema
          type ShowData = {
            id: string;
            date: string | null;
            venue: string | null;
            city: string | null;
          };
          
          const enrichedData: EnrichedShowData[] = []; // Explicitly type the array
          
          // Make sure shows is an array and handle the type properly
          if (shows) {
            // Process each show
            for (const show of shows as any[]) {
              // Get setlist
              const { data: setlist, error: setlistError } = await supabase
                .from('setlists')
                .select('id')
                .eq('show_id', show.id)
                .single();
                
              if (setlistError && setlistError.code !== 'PGRST116') { 
                // PGRST116 is "no rows returned" - not an error in this context
                console.warn(`No setlist for show ${show.id}`);
                continue;
              }
              
              if (setlist) {
                // Get songs for this setlist
                const { data: songs, error: songsError } = await supabase
                  .from('played_setlist_songs')
                  .select('id, name, vote_count, song_id, artist_id, position')
                  .eq('setlist_id', setlist.id)
                  .order('position', { ascending: true })
                  .order('vote_count', { ascending: false });
                  
                if (songsError) throw songsError;
                  
                enrichedData.push({
                  ...show,
                  setlist: setlist,
                  songs: songs || []
                });
              } else {
                // Include shows without setlists too
                enrichedData.push({
                  ...show,
                  setlist: null,
                  songs: []
                });
              }
            }
          }
          
          setData(enrichedData);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Regular entity query
        if (isRealEntity(entity)) {
          let query = supabase
            .from(entity)
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(limit);

          // Apply filters (only if value is string/number/boolean)
          Object.entries(filter).forEach(([key, value]) => {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              query = query.eq(key, value);
            }
          });

          const { data: result, error } = await query;

          if (error) throw error;

          setData(result || []);
          setError(null);
        }
      } catch (err) {
        console.error(`Failed to load ${entity}:`, err);
        setError(`Failed to load ${entity}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for standard entities
    let channel: { unsubscribe: () => void } | null = null;
    if (entity !== 'past_setlists') {
      channel = supabase
        .channel('realtime-data')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: entity
        }, () => fetchData())
        .subscribe();
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, supabase, limit, JSON.stringify(filter)]);

  // Function to handle manual refresh
  const handleRetry = async () => {
    await fetchDataFromAPI(filter.artist_id);
    setLoading(true);
    window.location.reload();
  };

  // Utility function to fetch data from API
  const fetchDataFromAPI = async (artistId: unknown) => {
    if (typeof artistId !== 'string') return;
    if (!artistId) return;
    
    try {
      const artistData = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
      
      if (artistData.error) throw artistData.error;
      
      // Call the sync API with artist name
      await fetch(`/api/sync?artist=${encodeURIComponent(artistData.data.name)}`);
    } catch (err) {
      console.error('Failed to sync data:', err);
    }
  };

  if (loading) {
    return <SkeletonLoader type={entity} />;
  }

  if (error) {
    return <DataErrorCard onRetry={handleRetry} />;
  }

  return children(data);
};

export default DataLoader;
