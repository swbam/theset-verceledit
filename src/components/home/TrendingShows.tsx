import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTrendingShowsFromDB } from '@/lib/api/db/trending-shows';
// This component displays trending shows that are populated by the venue-based import system

const TrendingShows = () => {
  const { data: trendingShows = [], isLoading } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: () => fetchTrendingShowsFromDB(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Trending Shows</h2>
            <p className="text-white/60 text-sm">Shows with the most active voting right now</p>
          </div>
          
          <Link to="/shows" className="group inline-flex items-center mt-2 md:mt-0">
            <span className="text-sm font-medium mr-1">View all</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800">
                <div className="aspect-video bg-zinc-800 animate-pulse"></div>
                <CardContent className="p-4">
                  <div className="h-5 bg-zinc-800 rounded w-2/3 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4 animate-pulse"></div>
                  <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))
          ) : trendingShows.length > 0 ? (
            trendingShows.map((show) => (
              <Card key={show.id} className="bg-zinc-900 border-zinc-800 overflow-hidden rounded-[3px]">
                <div className="aspect-video relative overflow-hidden bg-zinc-800 rounded-t-[3px]">
                  {show.image_url ? (
                    <img 
                      src={show.image_url} 
                      alt={show.name} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('bg-[#222]');
                        (e.target as HTMLImageElement).parentElement!.innerHTML += '<div class="flex items-center justify-center h-full w-full"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10 text-white/40"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs uppercase">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                    {show.vote_count || 0} votes
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-1 text-white truncate">
                    {show.artist?.name || 'Unknown Artist'}
                  </h3>
                  <p className="text-white/80 text-sm mb-3 truncate">
                    {show.name}
                  </p>
                  
                  <Button asChild className="w-full" size="sm">
                    <Link to={`/shows/${show.id}`}>View Setlist</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-white/60">No trending shows at the moment</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingShows;
