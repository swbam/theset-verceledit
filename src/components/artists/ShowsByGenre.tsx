
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchShowsByGenre, popularMusicGenres } from '@/lib/ticketmaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, CalendarDays, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ShowsByGenreProps {
  genreId?: string;
  genreName?: string;
}

const ShowsByGenre: React.FC<ShowsByGenreProps> = ({ genreId, genreName }) => {
  const [activeGenre, setActiveGenre] = React.useState(genreId || popularMusicGenres[0].id);

  const { data: shows = [], isLoading } = useQuery({
    queryKey: ['showsByGenre', activeGenre],
    queryFn: () => fetchShowsByGenre(activeGenre, 8),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBA";
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "TBA";
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "TBA";
    }
  };

  return (
    <section className="px-6 md:px-8 lg:px-12 py-16 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Top Upcoming Shows</h2>
          <p className="text-muted-foreground">Browse upcoming concerts by genre and vote on setlists</p>
        </div>

        <Tabs defaultValue={activeGenre} onValueChange={setActiveGenre} className="w-full">
          <div className="mb-6 border-b border-border">
            <TabsList className="bg-transparent h-auto p-0 w-auto overflow-x-auto flex-wrap justify-start">
              {popularMusicGenres.map((genre) => (
                <TabsTrigger
                  key={genre.id}
                  value={genre.id}
                  className={cn(
                    "py-2 px-4 text-sm font-medium data-[state=active]:bg-transparent",
                    "data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary",
                    "data-[state=active]:shadow-none rounded-none"
                  )}
                >
                  {genre.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {popularMusicGenres.map((genre) => (
            <TabsContent key={genre.id} value={genre.id} className="pt-2">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                      <Skeleton className="h-32 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : shows.length === 0 ? (
                <div className="text-center py-12 border border-border rounded-lg bg-secondary/30">
                  <p className="text-muted-foreground">No upcoming shows found for this genre</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {shows.map((show, index) => (
                    <Link
                      key={show.id}
                      to={`/shows/${show.id}`}
                      className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-all hover:border-primary/30 hover:-translate-y-1"
                    >
                      <div className="relative h-32 bg-secondary overflow-hidden">
                        {show.image_url ? (
                          <img
                            src={show.image_url}
                            alt={show.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <span className="text-muted-foreground">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {show.name}
                        </h3>
                        <p className="text-primary/80 text-xs mt-1 line-clamp-1">
                          {show.artist?.name || "Various Artists"}
                        </p>
                        <div className="mt-3 flex items-center text-xs text-muted-foreground">
                          <CalendarDays size={14} className="mr-1" />
                          <span>{formatDate(show.date)}</span>
                        </div>
                        <div className="mt-1 flex items-center text-xs text-muted-foreground">
                          <MapPin size={14} className="mr-1" />
                          <span className="line-clamp-1">
                            {show.venue?.name}, {show.venue?.city || "Location TBA"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-8 text-center">
                <Link
                  to="/shows"
                  className="inline-flex items-center text-primary hover:underline"
                >
                  View all {genre.name} shows
                  <ChevronRight size={16} className="ml-1" />
                </Link>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default ShowsByGenre;
