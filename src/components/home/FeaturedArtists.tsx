import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeaturedArtists } from '@/lib/api/artist';

const FeaturedArtists = () => {
  const { data: artistsData = [], isLoading, error } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(6),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter out duplicate artists by ID
  const uniqueArtists = artistsData.reduce((acc, current) => {
    const x = acc.find(item => item.id === current.id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  return (
    <section className="py-12 md:py-16 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Featured Artists</h2>
            <p className="text-sm text-white/60 mt-1">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="text-white hover:text-white/80 flex items-center text-sm">
            View all <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, index) => (
              <div key={index} className="bg-black border border-white/10 rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5 col-span-6">
              <p className="text-white/60">No featured artists found</p>
            </div>
          ) : (
            uniqueArtists.slice(0, 6).map((artist) => (
              <Link 
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="bg-black border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all hover:translate-y-[-2px]"
              >
                <div className="aspect-square overflow-hidden">
                  {artist.image ? (
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center">
                      <span className="text-white/20 font-bold text-xl">{artist.name.substring(0, 1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-white mb-1 truncate">
                    {artist.name}
                  </h3>
                  
                  {typeof artist.upcoming_shows === 'number' && (
                    <div className="text-xs text-white/60">
                      {artist.upcoming_shows} {artist.upcoming_shows === 1 ? 'show' : 'shows'}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists;
