
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ArtistCard from '../artist/ArtistCard';
import { fetchFeaturedArtists } from '@/lib/ticketmaster';
import { Skeleton } from '@/components/ui/skeleton';

const FeaturedArtists = () => {
  const { data: artists = [], isLoading, error } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(4),
  });

  // Ensure no duplicate artists by ID
  const uniqueArtists = React.useMemo(() => {
    const uniqueMap = new Map();
    artists.forEach(artist => {
      if (!uniqueMap.has(artist.id)) {
        uniqueMap.set(artist.id, artist);
      }
    });
    return Array.from(uniqueMap.values());
  }, [artists]);

  return (
    <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <span className="block text-sm font-medium text-muted-foreground mb-2">Featured</span>
            <h2 className="text-3xl md:text-4xl font-bold">Trending Artists</h2>
          </div>
          
          <Link 
            to="/artists" 
            className="mt-4 md:mt-0 group inline-flex items-center text-foreground hover:text-primary transition-colors"
          >
            View all artists
            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-5 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Unable to load featured artists</p>
          </div>
        ) : uniqueArtists.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No featured artists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {uniqueArtists.map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedArtists;
