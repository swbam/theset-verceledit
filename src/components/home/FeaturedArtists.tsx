
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

  // Mock data to match the design
  const mockArtists = [
    { id: "artist1", name: "Taylor Swift", image: "https://media.pitchfork.com/photos/61d4ca4cef233215262a2e2b/master/w_1600,c_limit/taylor-swift-bb13-2021-billboard-1548.jpg", upcoming_shows: 14, genres: ["Pop"] },
    { id: "artist2", name: "Coldplay", image: "https://footprintuscoalition.com/wp-content/uploads/2023/05/pasted-image-0-2.png", upcoming_shows: 8, genres: ["Alternative"] },
    { id: "artist3", name: "Beyoncé", image: "https://www.rollingstone.com/wp-content/uploads/2022/07/Beyonce-RENAISSANCE-album.jpg", upcoming_shows: 10, genres: ["R&B"] },
    { id: "artist4", name: "Bad Bunny", image: "https://people.com/thmb/KU6lR4yLwSQYC_GYkJn68NlhG8Q=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc():focal(969x659:971x661)/bad-bunny-most-waited-tour-081623-3-7c86c5a1af994b8984f1b1d19917f45b.jpg", upcoming_shows: 12, genres: ["Latin"] },
    { id: "artist5", name: "Kendrick Lamar", image: "https://media.pitchfork.com/photos/6453af0a8cd4a45aea5f27f4/16:9/w_1280,c_limit/Kendrick-Lamar.jpg", upcoming_shows: 7, genres: ["Hip-Hop"] },
    { id: "artist6", name: "Billie Eilish", image: "https://www.billboard.com/wp-content/uploads/2023/06/Billie-Eilish-press-2023-cr-Mason-Poole-billboard-1548.jpg", upcoming_shows: 9, genres: ["Pop"] }
  ];

  // Use mock data for display
  const artists = mockArtists;

  return (
    <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-[#0A0A10] to-[#0d0d15]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Featured Artists</h2>
            <p className="text-sm md:text-base text-white/70 mt-1">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
          {isLoading ? (
            [...Array(6)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 md:p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <div className="flex gap-1 mt-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5 col-span-6">
              <p className="text-white/60">No featured artists found</p>
            </div>
          ) : (
            artists.map((artist) => (
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
                  
                  {artist.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {artist.genres.slice(0, 1).map((genre, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs bg-white/5 hover:bg-white/10 transition-colors px-1.5 py-0.5"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {typeof artist.upcoming_shows === 'number' && artist.upcoming_shows > 0 && (
                    <div className="mt-1 text-xs text-white/60">
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
