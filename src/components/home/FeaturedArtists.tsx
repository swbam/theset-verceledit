
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music2, ChevronRight, Star, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchFeaturedArtists } from '@/lib/api/artist';

const FeaturedArtists = () => {
  const { data: artistsData = [], isLoading, error } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(12),
  });

  // Filter and limit artists, prioritizing those with images and genres
  const artists = React.useMemo(() => {
    // Sort by combination of factors - image quality, has genres, number of upcoming shows
    return [...artistsData]
      .sort((a, b) => {
        // First prioritize artists with images
        if (a.image && !b.image) return -1;
        if (!a.image && b.image) return 1;
        
        // Then prioritize artists with genres
        const aHasGenres = a.genres && a.genres.length > 0;
        const bHasGenres = b.genres && b.genres.length > 0;
        if (aHasGenres && !bHasGenres) return -1;
        if (!aHasGenres && bHasGenres) return 1;
        
        // Finally prioritize by popularity or upcoming shows
        return (b.popularity || 0) - (a.popularity || 0) || 
               (b.upcoming_shows || 0) - (a.upcoming_shows || 0);
      })
      .slice(0, 6);
  }, [artistsData]);

  return (
    <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-[#0A0A10] to-[#0d0d15]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Featured Artists</h2>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-sm md:text-base text-white/70 mt-1">Popular artists with upcoming shows</p>
          </div>
          <Link to="/artists" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 md:p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <div className="flex gap-1 mt-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
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
                      <Music2 className="h-10 w-10 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4">
                  <h3 className="font-bold text-sm md:text-base mb-1.5 line-clamp-1">
                    {artist.name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {artist.genres?.slice(0, 2).map((genre, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs bg-white/5 hover:bg-white/10 transition-colors px-1.5 py-0.5"
                      >
                        {genre}
                      </Badge>
                    ))}
                    
                    {(!artist.genres || artist.genres.length === 0) && (
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-white/5 hover:bg-white/10 transition-colors px-1.5 py-0.5"
                      >
                        {artist.popularity > 80 ? 'Top Artist' : 'Popular'}
                      </Badge>
                    )}
                  </div>
                  
                  {typeof artist.upcoming_shows === 'number' && artist.upcoming_shows > 0 && (
                    <div className="mt-2 text-xs md:text-sm text-white/60 flex items-center">
                      <Calendar className="h-3 w-3 mr-1.5 opacity-70" />
                      {artist.upcoming_shows} {artist.upcoming_shows === 1 ? 'show' : 'shows'}
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
