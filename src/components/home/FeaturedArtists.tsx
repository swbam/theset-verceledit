import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchFeaturedArtists } from '@/lib/api/artist/featured';

const FeaturedArtists = () => {
  const { data: featuredArtists = [], isLoading } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(),
  });

  return (
    <section className="py-8 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Featured Artists</h2>
            <p className="text-white/60 text-sm">Top artists with upcoming shows to vote on</p>
          </div>
          
          <Link to="/artists" className="group inline-flex items-center mt-2 md:mt-0">
            <span className="text-sm font-medium mr-1">View all</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-zinc-900 animate-pulse mb-3"></div>
                <div className="h-4 bg-zinc-900 rounded w-20 mb-1 animate-pulse"></div>
                <div className="h-3 bg-zinc-900 rounded w-12 animate-pulse"></div>
              </div>
            ))
          ) : featuredArtists.length > 0 ? (
            featuredArtists.map((artist) => (
              <Link 
                key={artist.id} 
                to={`/artists/${artist.id}`}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-zinc-900 mb-3 group-hover:ring-2 ring-white/20 transition-all">
                  {artist.image_url || artist.image ? (
                    <img 
                      src={artist.image_url || artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 uppercase text-xs">
                      No Image
                    </div>
                  )}
                </div>
                
                <h3 className="font-medium text-sm text-white">{artist.name}</h3>
                <p className="text-white/60 text-xs mt-1">
                  {artist.upcoming_shows || 0} {artist.upcoming_shows === 1 ? 'show' : 'shows'}
                </p>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-white/60">No featured artists available</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists;
