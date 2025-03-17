
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchFeaturedArtists } from '@/lib/ticketmaster';
import { getMyTopArtists } from '@/lib/spotify/user-recommendations';

const FeaturedArtists = () => {
  // Fetch featured artists from Ticketmaster
  const { data: artistsData = [], isLoading: isArtistsLoading, error: artistsError } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(12), // Fetch more to ensure we have enough after filtering
  });

  // Also fetch user recommendations if logged in
  const { data: recommendedArtists = [], isLoading: isRecsLoading } = useQuery({
    queryKey: ['recommendedArtists'],
    queryFn: getMyTopArtists,
    // Don't fail if the query errors (user might not be logged in)
    retry: false,
    enabled: false, // Only enable when needed
  });

  // Ensure we have unique artists by ID, prioritizing high popularity ones
  const uniqueArtists = React.useMemo(() => {
    const allArtists = [...artistsData, ...recommendedArtists];
    const uniqueMap = new Map();
    
    // First pass: add all artists to map
    allArtists.forEach(artist => {
      if (!uniqueMap.has(artist.id)) {
        uniqueMap.set(artist.id, {
          ...artist,
          // Default higher popularity for user recommendations
          popularity: artist.popularity || (recommendedArtists.includes(artist) ? 90 : 50)
        });
      } else if (artist.popularity && artist.popularity > (uniqueMap.get(artist.id).popularity || 0)) {
        // Update if the popularity is higher
        const existingArtist = uniqueMap.get(artist.id);
        uniqueMap.set(artist.id, {
          ...existingArtist,
          ...artist,
          popularity: Math.max(artist.popularity, existingArtist.popularity || 0)
        });
      }
    });

    // Sort by popularity and take top 6
    return Array.from(uniqueMap.values())
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6);
  }, [artistsData, recommendedArtists]);

  const isLoading = isArtistsLoading || isRecsLoading;

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0A0A12] to-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Featured Artists</h2>
            <p className="text-base text-white/70 mt-1">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="text-white hover:text-white/80 font-medium flex items-center group">
            View all <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-xl overflow-hidden border border-white/10">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-1" />
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : artistsError ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load featured artists</p>
          </div>
        ) : uniqueArtists.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/60">No featured artists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {uniqueArtists.map(artist => (
              <Link 
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] group"
              >
                <div className="aspect-square overflow-hidden relative">
                  {artist.image ? (
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                      <Music className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">
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
