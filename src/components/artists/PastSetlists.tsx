import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Music, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SetlistData } from '@/lib/sync/types'; // Import the central type

interface PastSetlistsProps {
  artistId: string;
  artistName: string;
}

// Define a type for the data structure expected from the API
// (Matches SetlistData structure from sync/types.ts, including nested song details)
interface PastSetlistDisplayData extends Omit<SetlistData, 'songs'> {
  id: string; // Ensure id is always present
  eventDate?: string | null; // From Setlist.fm data potentially
  venue?: { name?: string; city?: { name?: string; country?: { name?: string } } } | null; // Structure from Setlist.fm
  sets?: { set?: { song?: { name: string }[] }[] } | null; // Structure from Setlist.fm
  // Add fields from the local DB query in the API route
  show?: {
    id: string;
    name: string;
    date: string | null;
    venue?: { // Add the nested venue object
      name: string;
      city: string | null;
      state: string | null;
    } | null;
  } | null;
  artist?: { id: string; name: string } | null;
  songs?: {
      id: string;
      position: number;
      is_encore: boolean;
      info: string | null;
      song: {
          id: string;
          name: string;
          // Add other song fields if needed by the component
      } | null;
  }[] | null;
}


const PastSetlists: React.FC<PastSetlistsProps> = ({ artistId, artistName }) => {
  const { data, isLoading, error } = useQuery<PastSetlistDisplayData[]>({ // Use the display data type
    queryKey: ['pastSetlists', artistId],
    queryFn: async () => {
      try {
        // Fetch past setlists from the new API route
        const response = await fetch(`/api/artists/${artistId}/past-setlists?limit=3`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const setlists = await response.json();
        console.log("Fetched past setlists from API:", setlists);
        return setlists || [];
      } catch (err) {
        console.error('Error fetching past setlists via API route:', err);
        toast.error('Failed to load past setlists');
        // Re-throw the error so React Query marks the query as errored
        throw err;
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (adjust as needed)
    retry: 1, // Retry once on failure
  });

  // Format date in a readable way
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date unknown";
    
    try {
      // Handle setlist.fm date format (DD-MM-YYYY)
      if (dateString.includes('-') && dateString.length === 10) {
        const [day, month, year] = dateString.split('-');
        const date = new Date(`${year}-${month}-${day}`);
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).format(date);
      }
      
      // Handle ISO date format
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "Date unknown";
    }
  };

  if (isLoading) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Past Setlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data || data.length === 0) {
    return null; // Don't show section if no past setlists found
  }

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Past Setlists</h2>
            <p className="text-muted-foreground mt-1">Review what {artistName} played at previous shows</p>
          </div>
          
          <Button variant="ghost" asChild className="mt-4 md:mt-0 group">
            <Link href={`/artists/${artistId}/setlists`}>
              <div className="flex items-center">
                See all setlists
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.slice(0, 3).map((setlist) => {
            // Extract venue and songs info
            // Use data potentially joined from the DB via the API route
            const venueName = setlist.show?.venue?.name || 'Unknown Venue';
            const venueCity = setlist.show?.venue?.city || '';
            const venueState = setlist.show?.venue?.state || '';
            const venueLocation = [venueCity, venueState].filter(Boolean).join(', ');

            // Extract songs from the joined played_setlist_songs data
            const songs = (setlist.songs ?? [])
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) // Sort by position
              .slice(0, 5) // Limit to 5
              .map(playedSong => playedSong.song?.name) // Get song name
              .filter((name): name is string => !!name); // Filter out null/undefined names
            
            return (
              <Card 
                key={setlist.id} 
                className="border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">{venueName}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" />
                    {formatDate(setlist.show?.date || setlist.eventDate || '')}
                  </CardDescription>
                  {venueLocation && (
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <MapPin size={14} className="text-primary" />
                      {venueLocation}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Songs played:</p>
                    <ul className="space-y-1.5">
                      {songs.length > 0 ? (
                        songs.map((song, i) => (
                          <li key={i} className="text-sm flex items-center gap-1.5">
                            <Music size={14} className="text-muted-foreground" />
                            {song}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">No song information available</li>
                      )}
                    </ul>
                    {/* Link to the show page if available, otherwise maybe disable or hide */}
                    {setlist.show?.id ? (
                      <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                        <Link href={`/show/${setlist.show.id}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Clock size={14} />
                            View Show & Setlist
                          </div>
                        </Link>
                      </Button>
                    ) : (
                       <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                         <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                           <Clock size={14} />
                           Setlist details unavailable
                         </div>
                       </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PastSetlists;
