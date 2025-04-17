import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Define the Show interface
interface Show {
  id: string;
  name: string;
  date: string | null;
  image_url: string | null;
  ticket_url: string | null;
  popularity: number | null;
  vote_count: number | null;
  artist: {
    id: string;
    name: string;
    image_url: string | null;
    genres: string[] | null;
  } | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

// Function to fetch trending shows from our API
import { supabase } from '@/integrations/supabase/client';

// Define the database function return type
type VoteCount = {
  show_id: string;
  vote_count: number;
}

/**
 * Show Data Synchronization System
 *
 * Real-time Updates:
 * 1. Component loads trending shows from Supabase, ordered by popularity
 * 2. For each show displayed, triggers a background sync with Ticketmaster
 * 3. Background sync updates show details, artist info, and venue data
 * 4. Updates are stored in Supabase for next page load
 *
 * Scheduled Updates:
 * - Hourly cron job finds upcoming shows not synced in last hour
 * - Automatically syncs up to 50 shows per run
 * - Ensures data stays fresh even when pages aren't being viewed
 *
 * Data Flow:
 * Ticketmaster API → Edge Functions → Supabase DB → Frontend
 * - Each layer has error handling and retry logic
 * - Frontend shows cached data first, then updates in background
 * - Provides instant page loads with fresh data
 */

// Define database types
type DbShow = {
  id: string;
  name: string;
  date: string | null;
  image_url: string | null;
  ticket_url: string | null;
  popularity: number | null;
  ticketmaster_id: string | null;
  artist: {
    id: string;
    name: string;
    image_url: string | null;
    genres: string[] | null;
  } | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
};

const fetchTrendingShowsFromAPI = async (): Promise<Show[]> => {
  try {
    // Get shows with their relationships
    const { data: shows, error: showError } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(id, name, image_url, genres),
        venue:venues(id, name, city, state, country)
      `)
      .gt('date', new Date().toISOString()) // Only future shows
      .order('popularity', { ascending: false })
      .order('date', { ascending: true })
      .limit(8);

    if (showError) {
      console.error('Error fetching shows:', showError);
      return [];
    }

    if (!shows) return [];

    // Transform shows and trigger background syncs
    const showsWithVotes = (shows as DbShow[]).map(show => {
      // Trigger background sync for each show
      if (show.ticketmaster_id) {
        supabase.functions.invoke('sync-show', {
          body: { showId: show.ticketmaster_id }
        }).catch(error => {
          console.error(`Background sync failed for show ${show.ticketmaster_id}:`, error);
        });
      }

      return {
        id: show.id,
        name: show.name,
        date: show.date,
        image_url: show.image_url,
        ticket_url: show.ticket_url,
        popularity: show.popularity || 0,
        vote_count: 0, // For now, we'll use popularity as a proxy for votes
        artist: show.artist ? {
          id: show.artist.id,
          name: show.artist.name,
          image_url: show.artist.image_url,
          genres: show.artist.genres
        } : null,
        venue: show.venue ? {
          id: show.venue.id,
          name: show.venue.name,
          city: show.venue.city,
          state: show.venue.state,
          country: show.venue.country
        } : null
      };
    });

    // Sort by vote count and then by date
    return showsWithVotes.sort((a, b) => {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count;
      }
      return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
    });
  } catch (error) {
    console.error('Error fetching trending shows:', error);
    return []; // Return empty array instead of throwing
  }
};

const TrendingShows = () => {
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: fetchTrendingShowsFromAPI,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Format date helper function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear()
      };
    } catch (error) {
      console.warn("Date formatting error:", error, dateString);
      return { day: "TBA", month: "", year: "" };
    }
  };

  // Ensure unique shows by ID and only use the top 4
  const uniqueShows = React.useMemo(() => {
    if (!showsData || !Array.isArray(showsData) || showsData.length === 0) {
      return [];
    }
    
    const uniqueMap = new Map<string, Show>();
    
    showsData.forEach(show => {
      if (!uniqueMap.has(show.id)) {
        uniqueMap.set(show.id, show);
      }
    });

    // Sort by popularity (descending)
    return Array.from(uniqueMap.values())
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 4);
  }, [showsData]);

  // Determine show genre
  const getShowGenre = (show: Show): string => {
    if (!show) return 'Pop';
    
    if (show.artist?.genres && show.artist.genres.length > 0) {
      return show.artist.genres[0];
    }
    
    // Assign a random genre for demo purposes if none exists
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Latin', 'R&B', 'Country', 'Electronic'];
    return genres[Math.floor(Math.random() * genres.length)];
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0A0A12] to-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Trending Shows</h2>
            <p className="text-base text-white/70 mt-1">Shows with the most active voting right now</p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            View all <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-xl overflow-hidden border border-white/10">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load trending shows</p>
          </div>
        ) : uniqueShows.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {uniqueShows.map((show) => {
              const formattedDate = formatDate(show.date || '');
              const genre = getShowGenre(show);
              
              return (
                <Link 
                  key={show.id} 
                  to={`/shows/${show.id}`}
                  className="bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {show.image_url ? (
                      <img 
                        src={show.image_url} 
                        alt={show.name || 'Show'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="bg-black/40 w-full h-full flex items-center justify-center">
                        <span className="text-white/40">No image</span>
                      </div>
                    )}
                    <Badge 
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white border border-white/10"
                    >
                      {genre}
                    </Badge>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A0A12] via-black/70 to-transparent pt-16 pb-4 px-4">
                      <div className="flex justify-between items-center">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className="fill-white text-white" />
                          ))}
                        </div>
                        <span className="text-white font-medium text-sm">{show.vote_count || show.popularity || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">
                      {show.name?.split(' - ')[0] || 'Untitled Show'}
                    </h3>
                    <p className="text-white/70 text-sm mb-3 line-clamp-1">
                      {show.artist?.name || 'Unknown Artist'}
                    </p>
                    <div className="flex flex-col space-y-2 text-sm text-white/60">
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-2 opacity-70" />
                        <span>
                          {typeof formattedDate === 'object' 
                            ? `${formattedDate.month} ${formattedDate.day}, ${formattedDate.year}` 
                            : formattedDate}
                        </span>
                      </div>
                      {show.venue && (
                        <div className="flex items-start">
                          <MapPin size={16} className="mr-2 mt-0.5 opacity-70" />
                          <span className="line-clamp-1">
                            {show.venue?.name ? `${show.venue.name}, ${show.venue.city || ''}` : 'Venue TBA'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingShows;
