
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music2, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchFeaturedArtists } from '@/lib/api/artist';

const FeaturedArtists = () => {
  const { data: artistsData = [], isLoading, error } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(12),
  });

  // Filter and limit artists
  const artists = React.useMemo(() => {
    return artistsData.slice(0, 6);
  }, [artistsData]);

  return (
    <section className="py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Featured Artists</h2>
            <p className="text-base text-white/70 mt-1">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="text-white hover:text-white/80 font-medium flex items-center group">
            View all <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No featured artists found</p>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No featured artists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {artists.map((artist) => (
              <Link 
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] group"
              >
                <div className="aspect-square overflow-hidden relative">
                  {artist.image ? (
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111]/80 flex items-center justify-center">
                      <Music2 className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base mb-2 line-clamp-1">
                    {artist.name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {artist.genres?.slice(0, 2).map((genre, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {genre}
                      </Badge>
                    ))}
                    
                    {(!artist.genres || artist.genres.length === 0) && (
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {artist.popularity > 80 ? 'Top Artist' : 'Popular'}
                      </Badge>
                    )}
                  </div>
                  
                  {typeof artist.upcoming_shows === 'number' && (
                    <div className="mt-3 text-sm text-white/60">
                      {artist.upcoming_shows} upcoming {artist.upcoming_shows === 1 ? 'show' : 'shows'}
                    </div>
                  )}
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
