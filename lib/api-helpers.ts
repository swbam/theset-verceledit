import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with better error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required environment variables for Supabase: ' +
    (!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : '') +
    (!supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : '')
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false, // Don't persist auth state for server functions
      autoRefreshToken: false, // Don't auto refresh token for server environment
    },
    global: {
      headers: {
        'x-application-name': 'theset-server',
      },
    },
  }
);

// Export direct reference for use in other modules
export { supabase };

// Export typesafe client for specific functions
export type SupabaseClient = typeof supabase;

/**
 * Get cached data or fetch fresh data and cache it
 * 
 * @param endpoint Unique identifier for the cached data
 * @param fetchFn Function to fetch fresh data if cache is invalid
 * @param expiryMinutes How long to cache the data (default: 60 minutes)
 */
export async function getCachedData<T>(
  endpoint: string,
  fetchFn: () => Promise<T>,
  expiryMinutes = 60
): Promise<T> {
  try {
    // Check for existing cache entry
    const { data: cacheData, error: cacheError } = await supabase
      .from('api_cache')
      .select('data, created_at, expires_at')
      .eq('endpoint', endpoint)
      .maybeSingle();
    
    // If we have valid cache data that hasn't expired, return it
    if (cacheData && !cacheError) {
      const now = new Date();
      const expiresAt = new Date(cacheData.expires_at);
      
      if (expiresAt > now) {
        console.log(`Returning cached data for ${endpoint}`);
        return cacheData.data as T;
      }
      console.log(`Cache expired for ${endpoint}`);
    }
    
    // Fetch fresh data
    console.log(`Fetching fresh data for ${endpoint}`);
    const freshData = await fetchFn();
    
    // Calculate expiry time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    // Cache the data
    const { error: upsertError } = await supabase
      .from('api_cache')
      .upsert({
        endpoint,
        data: freshData,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'endpoint'
      });
    
    if (upsertError) {
      console.error(`Error caching data for ${endpoint}:`, upsertError);
    }
    
    return freshData;
  } catch (error) {
    console.error(`Error in getCachedData for ${endpoint}:`, error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: `cache-${endpoint}`,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    
    // Try to fetch fresh data anyway as fallback
    return await fetchFn();
  }
}

/**
 * Invalidate a cached item (use when data is updated)
 */
export async function invalidateCache(endpoint: string): Promise<void> {
  try {
    await supabase
      .from('api_cache')
      .delete()
      .eq('endpoint', endpoint);
      
    console.log(`Invalidated cache for ${endpoint}`);
  } catch (error) {
    console.error(`Error invalidating cache for ${endpoint}:`, error);
  }
}

/**
 * Using optimized materialized view for top voted songs
 */
export async function getTopVotedSongs(artistId?: string, limit = 20) {
  try {
    let query = supabase
      .from('mv_top_voted_songs')
      .select('*')
      .order('vote_count', { ascending: false })
      .limit(limit);
      
    if (artistId) {
      query = query.eq('artist_id', artistId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching top voted songs:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getTopVotedSongs:', error);
    return [];
  }
}

/**
 * Using materialized view for artist popularity
 */
export async function getPopularArtists(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('mv_artist_popularity')
      .select('*')
      .order('total_votes', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching popular artists:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getPopularArtists:', error);
    return [];
  }
} 