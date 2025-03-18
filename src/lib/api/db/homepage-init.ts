import { supabase } from "@/integrations/supabase/client";
import { createSetlistsForSpecificShows } from "./setlist-batch";

/**
 * Types of featured show categories on the homepage
 */
export type HomepageFeatureType = 
  | 'trending' 
  | 'upcoming' 
  | 'recommended' 
  | 'popular';

/**
 * Initialize setlists for all shows that appear on the homepage
 * This ensures users never see the "Creating setlist" message when
 * clicking on any featured shows from the homepage
 */
export async function initializeHomepageShowSetlists(): Promise<{ 
  processed: number, 
  created: number, 
  errors: string[] 
}> {
  console.log("Initializing setlists for homepage shows");
  
  try {
    // Collect show IDs from all homepage feature sections
    const allShowIds = await collectHomepageShowIds();
    
    if (!allShowIds.length) {
      console.log("No homepage shows found that need setlists");
      return { processed: 0, created: 0, errors: [] };
    }
    
    console.log(`Found ${allShowIds.length} homepage shows to check for setlists`);
    
    // Create setlists for all these shows
    return await createSetlistsForSpecificShows(allShowIds);
  } catch (error) {
    console.error("Error initializing homepage setlists:", error);
    return { 
      processed: 0, 
      created: 0, 
      errors: [`Error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

/**
 * Collect all show IDs that appear on the homepage from various features
 */
async function collectHomepageShowIds(): Promise<string[]> {
  const showIds = new Set<string>();
  
  // Get trending shows (most viewed this week)
  const trendingIds = await getShowIdsByFeatureType('trending');
  trendingIds.forEach(id => showIds.add(id));
  
  // Get upcoming shows (featured on homepage)
  const upcomingIds = await getShowIdsByFeatureType('upcoming');
  upcomingIds.forEach(id => showIds.add(id));
  
  // Get popular artist shows
  const popularIds = await getPopularArtistShows();
  popularIds.forEach(id => showIds.add(id));
  
  return Array.from(showIds);
}

/**
 * Get show IDs by feature type from the database
 */
async function getShowIdsByFeatureType(type: HomepageFeatureType): Promise<string[]> {
  try {
    // Check if we have a homepage_features table
    const { data: hasTable } = await supabase
      .from('homepage_features')
      .select('count(*)', { count: 'exact', head: true });
    
    // If we have the table, query it
    if (hasTable !== null) {
      const { data, error } = await supabase
        .from('homepage_features')
        .select('show_id')
        .eq('feature_type', type)
        .limit(20);
      
      if (error) {
        console.error(`Error fetching ${type} shows:`, error);
        return [];
      }
      
      return data.map(item => item.show_id);
    }
    
    // Fallback: If we don't have a homepage_features table,
    // use query logic to simulate what would be featured
    
    // For trending shows: shows with most recent views
    if (type === 'trending') {
      const { data, error } = await supabase
        .from('shows')
        .select('id')
        .order('view_count', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error fetching trending shows:", error);
        return [];
      }
      
      return data.map(show => show.id);
    }
    
    // For upcoming shows: nearest upcoming shows
    if (type === 'upcoming') {
      const { data, error } = await supabase
        .from('shows')
        .select('id')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error("Error fetching upcoming shows:", error);
        return [];
      }
      
      return data.map(show => show.id);
    }
    
    return [];
  } catch (error) {
    console.error(`Error in getShowIdsByFeatureType(${type}):`, error);
    return [];
  }
}

/**
 * Get shows for popular artists (by Spotify popularity)
 */
async function getPopularArtistShows(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select(`
        id,
        shows (id)
      `)
      .order('popularity', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error("Error fetching popular artist shows:", error);
      return [];
    }
    
    // Flatten the nested shows arrays
    const showIds: string[] = [];
    data.forEach(artist => {
      if (artist.shows && Array.isArray(artist.shows)) {
        artist.shows.forEach(show => {
          if (show && show.id) {
            showIds.push(show.id);
          }
        });
      }
    });
    
    return showIds;
  } catch (error) {
    console.error("Error in getPopularArtistShows:", error);
    return [];
  }
}

/**
 * Initialize setlists for a specific feature type 
 * (useful to call directly from client code)
 */
export async function initializeFeatureTypeSetlists(type: HomepageFeatureType): Promise<{ 
  processed: number, 
  created: number, 
  errors: string[] 
}> {
  try {
    const showIds = await getShowIdsByFeatureType(type);
    
    if (!showIds.length) {
      console.log(`No ${type} shows found that need setlists`);
      return { processed: 0, created: 0, errors: [] };
    }
    
    console.log(`Found ${showIds.length} ${type} shows to check for setlists`);
    
    // Create setlists for all these shows
    return await createSetlistsForSpecificShows(showIds);
  } catch (error) {
    console.error(`Error initializing ${type} setlists:`, error);
    return { 
      processed: 0, 
      created: 0, 
      errors: [`Error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
} 