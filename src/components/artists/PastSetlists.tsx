
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Music, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchShowsByGenre } from '@/lib/ticketmaster';

interface PastSetlistsProps {
  artistId: string;
  artistName: string;
}

const PastSetlists: React.FC<PastSetlistsProps> = ({ artistId, artistName }) => {
  // For demo purposes, we'll just fetch some shows and pretend they're past shows with setlists
  const { data: pastShows = [], isLoading } = useQuery({
    queryKey: ['pastShows', artistId],
    queryFn: () => fetchShowsByGenre('KnvZfZ7vAeA', 3), // Just fetch some rock shows as an example
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Format date in a readable way
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date unknown";
    
    try {
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

  if (pastShows.length === 0) {
    return null; // Don't show section if no past shows
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
            <Link to={`/artists/${artistId}/setlists`}>
              <div className="flex items-center">
                See all setlists
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pastShows.map((show, index) => {
            // For demo purposes, generate a few random songs as the "past setlist"
            const sampleSongs = [
              'Greatest Hit',
              'Fan Favorite',
              'Chart Topper',
              'Classic Track',
              'New Single'
            ];
            
            return (
              <Card 
                key={show.id} 
                className="border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">{show.venue?.name || 'Venue'}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" />
                    {formatDate(show.date)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Top songs played:</p>
                    <ul className="space-y-1.5">
                      {sampleSongs.slice(0, 3).map((song, i) => (
                        <li key={i} className="text-sm flex items-center gap-1.5">
                          <Music size={14} className="text-muted-foreground" />
                          {song}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                      <Link to={`/shows/${show.id}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock size={14} />
                          View full setlist
                        </div>
                      </Link>
                    </Button>
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
