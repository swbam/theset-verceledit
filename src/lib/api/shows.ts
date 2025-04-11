import { retryableFetch } from '@/lib/retry';
import type { Show, Artist, Venue as AppVenue } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

// Type for Ticketmaster Image object (duplicate from shared types, consider consolidating later)
interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

// Type for the raw event object from Ticketmaster API response (duplicate from shared types)
interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string } };
  images?: TicketmasterImage[];
  popularity?: number;
  _embedded?: {
    venues?: Array<{ id: string; name: string; city?: { name: string }; state?: { name: string }; country?: { name: string }; address?: { line1?: string }; postalCode?: string; images?: TicketmasterImage[] }>;
    attractions?: Array<{ id: string; name: string; images?: TicketmasterImage[] }>;
  };
}

// Helper function to map Ticketmaster event to our Show type (duplicate from shared utils)
// TODO: Consolidate this mapping logic if possible
function mapTicketmasterEventToShow(event: TicketmasterEvent): Show {
    let imageUrl;
    if (event.images && event.images.length > 0) {
      const sortedImages = [...event.images].sort((a, b) => (b.width || 0) - (a.width || 0));
      imageUrl = sortedImages[0]?.url;
    }
    // Ensure the created artist object satisfies the nested type in Show
    let mappedArtist: Show['artist'] | undefined = undefined;
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      if (attraction.id && attraction.name) { // Check required fields
         mappedArtist = {
           id: attraction.id,
           name: attraction.name,
           image_url: attraction.images?.[0]?.url
           // genres are not directly available here
         };
      }
    }
    // Ensure the created venue object satisfies the nested type in Show
    let mappedVenue: Show['venue'] | undefined = undefined;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venueData = event._embedded.venues[0];
       if (venueData.id && venueData.name) { // Check required fields
          mappedVenue = {
            id: venueData.id,
            ticketmaster_id: venueData.id, // Add TM ID
            name: venueData.name,
            city: venueData.city?.name,
            state: venueData.state?.name,
            country: venueData.country?.name
            // address, postal_code, image_url are not part of the nested Show['venue'] type
          };
       }
    }
    return {
      id: event.id, 
      ticketmaster_id: event.id, 
      name: event.name, 
      date: event.dates?.start?.dateTime || new Date().toISOString(), 
      ticket_url: event.url, 
      image_url: imageUrl, 
      artist_id: mappedArtist?.id, 
      artist: mappedArtist, 
      venue_id: mappedVenue?.id, 
      venue: mappedVenue, 
      popularity: event.popularity || 0,
    };
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create Supabase client with admin access
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch details for a specific show by ID (Client-side usage)
 */
export async function fetchShowDetails(showId: string): Promise<Show | null> {
  try {
    if (!showId) return null;

    // Use import.meta.env for client-side access
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      return null;
    }

    const response: TicketmasterEvent = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${apiKey}`;
      const result = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!result.ok) {
         if (result.status === 404) return null; // Return null if show not found
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) return null;

    return mapTicketmasterEventToShow(response);

  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Fetch shows by music genre (Client-side usage)
 */
export async function fetchShowsByGenre(
  genre: string,
  size: number = 20,
  fromDate: string = new Date().toISOString().split('T')[0]
): Promise<Show[]> {
  try {
    if (!genre) return [];

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=${encodeURIComponent(genre)}&size=${size}&startDateTime=${fromDate}T00:00:00Z&sort=date,asc`;
      const result = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) return [];

    // Map using the helper function
    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    return events;

  } catch (error) {
    console.error("Error fetching shows by genre:", error);
    return [];
  }
}

/**
 * Fetch shows from the database
 */
export async function getShows(params: any = {}) {
  const { 
    artistId, 
    venueId, 
    limit = 20, 
    page = 1, 
    upcoming = false,
    past = false
  } = params;
  
  let query = supabase
    .from('shows')
    .select(`
      *,
      artist:artists(id, name, image_url),
      venue:venues(id, name, city, state, country)
    `);

  // Apply filters
  if (artistId) {
    query = query.eq('artist_id', artistId);
  }
  
  if (venueId) {
    query = query.eq('venue_id', venueId);
  }
  
  if (upcoming) {
    const today = new Date().toISOString();
    query = query.gte('date', today);
  }
  
  if (past) {
    const today = new Date().toISOString();
    query = query.lt('date', today);
  }
  
  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query
    .order('date', { ascending: upcoming })
    .range(from, to);
  
  if (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }
  
  return {
    shows: data || [],
    total: count || 0,
    page,
    limit
  };
}

/**
 * Fetch a single show by ID
 */
export async function getShowById(id: string) {
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      artist:artists(*),
      venue:venues(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching show:', error);
    throw error;
  }
  
  return data;
}

/**
 * Sync popular/trending shows
 */
export async function syncTrendingShows() {
  try {
    // Calculate trending shows based on multiple factors
    // 1. Most voted shows in the last 7 days
    // 2. Upcoming shows (within the next 30 days)
    // 3. Shows with a lot of interaction

    // Get current date for calculations
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtyDaysAhead = new Date(now);
    thirtyDaysAhead.setDate(now.getDate() + 30);

    // Get shows with most votes in the last 7 days
    const { data: trendingByVotes } = await supabase.rpc('get_trending_shows_by_votes', {
      p_days_back: 7,
      p_limit: 10
    });

    // Get upcoming shows with the most interest
    const { data: upcomingShows } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        view_count,
        artist_id,
        venue_id,
        artist:artists(name, image_url),
        venue:venues(name, city, state, country),
        votes:votes(count)
      `)
      .gte('date', now.toISOString())
      .lte('date', thirtyDaysAhead.toISOString())
      .order('view_count', { ascending: false })
      .limit(20);

    // Combine and deduplicate results
    const allTrendingShows = [...(trendingByVotes || []), ...(upcomingShows || [])];
    const uniqueShowIds = new Set();
    const uniqueTrendingShows = allTrendingShows.filter(show => {
      if (uniqueShowIds.has(show.id)) return false;
      uniqueShowIds.add(show.id);
      return true;
    });

    // Calculate trending score for each show
    const scoredShows = uniqueTrendingShows.map(show => {
      // Calculate proximity to current date (closer = higher score)
      const showDate = new Date(show.date);
      const daysUntilShow = Math.max(0, Math.floor((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const proximityScore = daysUntilShow <= 30 ? (30 - daysUntilShow) / 30 : 0;
      
      // Calculate vote score
      const voteCount = show.votes?.reduce((total: number, vote: any) => total + (vote.count || 0), 0) || 0;
      const voteScore = Math.min(1, voteCount / 50); // Cap at 50 votes for max score
      
      // Calculate view score
      const viewScore = Math.min(1, (show.view_count || 0) / 100); // Cap at 100 views for max score
      
      // Combined score (weighted)
      const trendingScore = (
        (proximityScore * 0.4) + // 40% weight on proximity
        (voteScore * 0.4) +      // 40% weight on votes
        (viewScore * 0.2)        // 20% weight on views
      ) * 100; // Scale to 0-100
      
      return {
        ...show,
        trending_score: Math.round(trendingScore)
      };
    });

    // Sort by trending score
    scoredShows.sort((a, b) => b.trending_score - a.trending_score);
    
    // Update trending_score in the database for top shows
    const topShows = scoredShows.slice(0, 20);
    
    const updates = topShows.map(show => 
      supabase
        .from('shows')
        .update({ trending_score: show.trending_score })
        .eq('id', show.id)
    );
    
    await Promise.all(updates);
    
    return {
      success: true,
      processed: topShows.length,
      topTrending: topShows.slice(0, 5)
    };
  } catch (error) {
    console.error('Error syncing trending shows:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync shows for a venue from Ticketmaster API
 */
export async function syncVenueShows(venueId: string) {
  try {
    // First get venue details
    const { data: venue } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();
    
    if (!venue) {
      throw new Error('Venue not found');
    }
    
    // No ticketmaster ID, can't sync
    if (!venue.ticketmaster_id) {
      return {
        success: false,
        error: 'No Ticketmaster ID for venue'
      };
    }
    
    // Fetch events from Ticketmaster API
    const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
    if (!TICKETMASTER_API_KEY) {
      throw new Error('Ticketmaster API key not configured');
    }
    
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?venueId=${venue.ticketmaster_id}&apikey=${TICKETMASTER_API_KEY}&size=100`
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    const events = data._embedded?.events || [];
    
    // Process each event
    const results = {
      total: events.length,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };
    
    for (const event of events) {
      try {
        const artistName = event._embedded?.attractions?.[0]?.name;
        const artistId = event._embedded?.attractions?.[0]?.id;
        
        if (!artistName) continue; // Skip events without artists
        
        // Check if artist exists, create if not
        let dbArtist;
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('*')
          .eq('ticketmaster_id', artistId)
          .maybeSingle();
        
        if (existingArtist) {
          dbArtist = existingArtist;
        } else {
          // Create new artist
          const { data: newArtist, error: artistError } = await supabase
            .from('artists')
            .insert({
              name: artistName,
              ticketmaster_id: artistId
            })
            .select()
            .single();
          
          if (artistError) throw artistError;
          dbArtist = newArtist;
        }
        
        // Prepare show data
        const showData = {
          name: event.name,
          date: event.dates.start.dateTime,
          status: event.dates.status.code,
          artist_id: dbArtist.id,
          venue_id: venueId,
          ticketmaster_id: event.id,
          external_url: event.url
        };
        
        // Check if show exists
        const { data: existingShow } = await supabase
          .from('shows')
          .select('*')
          .eq('ticketmaster_id', event.id)
          .maybeSingle();
        
        if (existingShow) {
          // Update existing show
          await supabase
            .from('shows')
            .update(showData)
            .eq('id', existingShow.id);
          
          results.updated++;
        } else {
          // Create new show
          await supabase
            .from('shows')
            .insert(showData);
          
          results.created++;
        }
      } catch (error) {
        console.error('Error processing event:', error);
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Error syncing venue shows:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}