import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

export function useArtistSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const syncArtist = async (artistId: string, options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'artist',
          entityId: artistId,
          options
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const error = err as Error;
      console.error('Error in useArtistSync:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncArtist,
    isLoading,
    error
  };
}