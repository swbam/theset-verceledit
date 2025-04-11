import { createClient } from '@supabase/supabase-js';
import type { Show } from '@/lib/types'; // Import Show type
import { Redis } from '@upstash/redis';

// Initialize Supabase client using VITE_ variables for consistency
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service key for server-side helpers

if (!supabaseUrl || !supabaseServiceKey) {
  // Log error instead of throwing during module load
  console.error(
    'CRITICAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY environment variables for api-helpers.'
  );
  // Allow initialization to proceed but client will likely fail later
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

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN || '',
    })
  : null;

/**
 * Utility to get data from cache or execute the fetch function
 * @param key Cache key
 * @param fetchFn Function to get fresh data
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // If Redis is not configured, just fetch the data
  if (!redis) {
    return fetchFn();
  }

  try {
    // Try to get data from cache
    const cachedData = await redis.get<T>(key);
    
    if (cachedData) {
      console.log(`Cache hit for ${key}`);
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    console.log(`Cache miss for ${key}, fetching fresh data`);
    const freshData = await fetchFn();
    
    // Store in cache
    if (freshData) {
      await redis.set(key, freshData, { ex: ttl });
    }
    
    return freshData;
  } catch (error) {
    console.error('Cache error:', error);
    // If any error with cache, fall back to fetching
    return fetchFn();
  }
}

/**
 * Utility to invalidate a cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  
  try {
    await redis.del(key);
    console.log(`Cache invalidated for ${key}`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Utility to log API errors
 */
export async function logApiError(
  endpoint: string,
  error: unknown,
  supabase: any
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${endpoint}] ${errorMessage}`);
  
  try {
    // Log to database if supabase client is provided
    if (supabase) {
      await supabase
        .from('error_logs')
        .insert({
          endpoint,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
    }
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
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

/**
 * Fetch trending shows directly from the database (ordered by popularity)
 */
export async function getTrendingShows(limit = 10): Promise<Show[]> { // Added return type
  try {
    console.log(`Fetching top ${limit} trending shows from database...`);
    
    // Query the 'shows' table directly
    // Select necessary fields and join with artists and venues
    const { data, error } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        image_url,
        ticket_url,
        popularity,
        artist:artists ( id, name ),
        venue:venues ( id, name, city, state )
      `)
      .order('popularity', { ascending: false, nullsFirst: false }) // Order by popularity descending
      .limit(limit);
      
    
  if (error) {
    console.error('Error fetching trending shows from database:', error);
    // Removed error_logs insertion
    return [];
  }
    console.log(`Successfully fetched ${data?.length || 0} trending shows from database.`);
    
    // Map the data to ensure artist and venue are single objects, not arrays
    const mappedData = data?.map(show => ({
      ...show,
      // Supabase might return joins as arrays, take the first element
      artist: Array.isArray(show.artist) ? show.artist[0] : show.artist,
      venue: Array.isArray(show.venue) ? show.venue[0] : show.venue,
    })) || [];
    
    return mappedData;
    
  } catch (error) {
    console.error('Unexpected error in getTrendingShows:', error);
    // Removed error_logs insertion
    return [];
  }
}
