
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeaturedArtists } from '@/lib/ticketmaster';

const FeaturedArtists = () => {
  const { data: artistsData = [], isLoading, error } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(6),
  });

  // Ensure we have unique artists by ID
  const uniqueArtists = React.useMemo(() => {
    const uniqueMap = new Map();
    
    artistsData.forEach(artist => {
      if (!uniqueMap.has(artist.id)) {
        uniqueMap.set(artist.id, artist);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 6);
  }, [artistsData]);

  return (
    <section className="py-16 px-4 bg-[#0A0A12]">
      <div className="container mx-auto max-w-5xl">
        <div className="section-header">
          <div>
            <h2 className="section-title">Featured Artists</h2>
            <p className="section-subtitle">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="view-all-button">
            View all →
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3">
                  <Skeleton className="h-4 w-2/3 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load featured artists</p>
          </div>
        ) : uniqueArtists.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/60">No featured artists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {uniqueArtists.map(artist => (
              <Link 
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02]"
              >
                <div className="aspect-square overflow-hidden relative">
                  {artist.image ? (
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                      <Music className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="p-3 text-left">
                  <h3 className="font-medium text-sm line-clamp-1">{artist.name}</h3>
                  <div className="flex items-center mt-1 text-xs text-white/60">
                    <span>{artist.upcoming_shows || 0} shows</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedArtists;
