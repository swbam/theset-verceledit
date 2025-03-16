
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusCircle, 
  Calendar, 
  Search, 
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import ShowCard from '@/components/shows/ShowCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { 
  fetchShowsByGenre, 
  popularMusicGenres, 
  fetchFeaturedShows,
  fetchFeaturedArtists
} from '@/lib/ticketmaster';
import { Card, CardContent } from "@/components/ui/card";

const Shows = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const genreParam = searchParams.get('genre');
  const artistParam = searchParams.get('artist');
  
  const [selectedGenre, setSelectedGenre] = useState(genreParam || '');
  const [activeGenreFilter, setActiveGenreFilter] = useState('All Genres');
  
  // When URL params change, update state
  React.useEffect(() => {
    if (genreParam) {
      setSelectedGenre(genreParam);
    }
  }, [genreParam]);
  
  // Fetch trending shows
  const { 
    data: trendingShows = [], 
    isLoading: isTrendingLoading,
  } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: () => fetchFeaturedShows(4),
  });

  // Fetch featured artists
  const { 
    data: featuredArtists = [], 
    isLoading: isArtistsLoading,
  } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(6),
  });
  
  // Fetch upcoming shows based on filter criteria
  const { 
    data: upcomingShows = [], 
    isLoading: isUpcomingLoading,
    error
  } = useQuery({
    queryKey: ['upcomingShows', selectedGenre, artistParam],
    queryFn: async () => {
      try {
        if (artistParam) {
          // Fetch shows for this artist
          const { fetchArtistEvents } = await import('@/lib/ticketmaster');
          return fetchArtistEvents(artistParam);
        } else if (selectedGenre) {
          // Find the genre ID based on name
          const genreObj = popularMusicGenres.find(g => g.name === selectedGenre);
          if (genreObj) {
            return fetchShowsByGenre(genreObj.id, 6);
          } 
          return [];
        } else {
          // Default to featured shows if no filters
          return fetchFeaturedShows(6);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
        toast.error("Failed to load shows");
        return [];
      }
    }
  });

  const handleGenreChange = (value: string) => {
    setSelectedGenre(value);
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set('genre', value);
      // Remove artist param if genre is selected
      newParams.delete('artist');
    } else {
      newParams.delete('genre');
    }
    
    setSearchParams(newParams);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter shows client-side based on search
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  };
  
  // Filter shows based on search input
  const filteredShows = upcomingShows.filter((show: any) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      show.name?.toLowerCase().includes(query) ||
      show.artist?.name?.toLowerCase().includes(query) ||
      show.venue?.name?.toLowerCase().includes(query) ||
      show.venue?.city?.toLowerCase().includes(query)
    );
  });

  // Generate genre badges for trending shows
  const getShowGenre = (show: any) => {
    if (show.genre) return show.genre;
    if (show.artist?.genres?.[0]) return show.artist.genres[0];
    
    // Assign a random genre for demo purposes if none exists
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Latin', 'R&B', 'Country', 'Electronic'];
    return genres[Math.floor(Math.random() * genres.length)];
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header section */}
        <section className="px-4 md:px-8 lg:px-12 py-12 bg-gradient-to-b from-[#111111] to-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="md:w-1/2">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Discover Live Shows</h1>
                <p className="text-white/70 md:text-lg mb-6">
                  Find concerts and vote on setlists for your favorite artists
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Link to="/shows/create">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-white/90">
                      <PlusCircle size={18} />
                      Create Show
                    </Button>
                  </Link>
                  
                  <Link to="/artists">
                    <Button variant="outline" size="lg" className="gap-2 border-white/20 hover:bg-white/10">
                      <Search size={18} />
                      Find Artists
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="md:w-1/2 max-w-sm mx-auto md:mx-0">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder="Search shows, artists or venues..."
                    className="w-full pl-10 pr-4 py-6 bg-white/10 border-white/20 placeholder:text-white/50 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                </form>
              </div>
            </div>
          </div>
        </section>
        
        {/* Trending Shows Section */}
        <section className="px-4 md:px-8 lg:px-12 py-16 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Trending Shows</h2>
                <p className="text-sm text-white/70 mt-1">Shows with the most active voting right now</p>
              </div>
              <Link to="/shows" className="flex items-center text-sm text-white hover:text-white/80">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isTrendingLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <Card key={i} className="bg-[#111111]/80 border-white/10 overflow-hidden">
                    <div className="aspect-[4/3] bg-[#222]"></div>
                    <CardContent className="p-4">
                      <div className="h-5 bg-[#333] rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-[#333] rounded w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                          <div className="h-3 bg-[#333] rounded w-1/3"></div>
                        </div>
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                          <div className="h-3 bg-[#333] rounded w-2/3"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                trendingShows.map((show: any) => {
                  const genre = getShowGenre(show);
                  const formattedDate = new Date(show.date).toLocaleDateString('en-US', {
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <Link key={show.id} to={`/shows/${show.id}`}>
                      <Card className="bg-[#111111]/80 border-white/10 overflow-hidden hover:border-white/30 transition duration-300 hover:scale-[1.02]">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {show.image_url ? (
                            <img 
                              src={show.image_url} 
                              alt={show.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#222]">
                              <Calendar className="h-8 w-8 text-white/40" />
                            </div>
                          )}
                          <Badge 
                            className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
                          >
                            {genre}
                          </Badge>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-10">
                            <div className="flex items-center justify-end p-3">
                              <div className="flex items-center bg-white/10 rounded-full px-2 py-0.5">
                                <span className="text-white text-xs font-medium">
                                  {Math.floor(Math.random() * 5000) + 1000}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">
                            {show.name.split(' - ')[0]}
                          </h3>
                          <p className="text-white/70 text-sm mb-3 line-clamp-1">
                            {show.artist?.name || 'Unknown Artist'}
                          </p>
                          <div className="flex flex-col space-y-2 text-sm text-white/60">
                            <div className="flex items-center">
                              <Calendar size={16} className="mr-2" />
                              <span>{formattedDate}</span>
                            </div>
                            {show.venue && (
                              <div className="flex items-start">
                                <span className="min-w-[16px] mr-2 mt-1">📍</span>
                                <span className="line-clamp-1">
                                  {`${show.venue.name}, ${show.venue.city || ''}`}
                                  {show.venue.state ? `, ${show.venue.state}` : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Featured Artists section */}
        <section className="px-4 md:px-8 lg:px-12 py-16 bg-[#0A0A12]">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Featured Artists</h2>
                <p className="text-sm text-white/70 mt-1">Top artists with upcoming shows to vote on</p>
              </div>
              <Link to="/artists" className="flex items-center text-sm text-white hover:text-white/80">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {isArtistsLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                    <div className="aspect-square bg-[#222]"></div>
                    <div className="p-3">
                      <div className="h-4 bg-[#333] rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-[#333] rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : (
                featuredArtists.slice(0, 6).map((artist: any) => (
                  <Link 
                    key={artist.id} 
                    to={`/artists/${artist.id}`}
                    className="bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="aspect-square overflow-hidden relative">
                      {artist.image ? (
                        <img 
                          src={artist.image} 
                          alt={artist.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#222] flex items-center justify-center">
                          <span className="text-white/40">🎵</span>
                        </div>
                      )}
                      <Badge 
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/60 text-white"
                      >
                        {artist.genres?.[0] || 'Pop'}
                      </Badge>
                    </div>
                    <div className="p-3 text-left">
                      <h3 className="font-medium text-sm line-clamp-1">{artist.name}</h3>
                      <div className="flex items-center mt-1 text-xs text-white/60">
                        <span>{artist.upcoming_shows || Math.floor(Math.random() * 15) + 1} shows</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
        
        {/* Upcoming Shows section */}
        <section className="px-4 md:px-8 lg:px-12 py-16 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Upcoming Shows</h2>
                <p className="text-sm text-white/70 mt-1">Browse and vote on setlists for upcoming concerts</p>
              </div>
              <Link to="/shows" className="flex items-center text-sm text-white hover:text-white/80">
                View all <ChevronRight size={16} />
              </Link>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setActiveGenreFilter('All Genres')}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                  activeGenreFilter === 'All Genres'
                    ? 'bg-white text-black font-medium'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                All Genres
              </button>
              
              {popularMusicGenres.slice(0, 6).map(genre => (
                <button
                  key={genre.id}
                  onClick={() => {
                    setActiveGenreFilter(genre.name);
                    handleGenreChange(genre.name);
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                    activeGenreFilter === genre.name
                      ? 'bg-white text-black font-medium'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
            
            {isUpcomingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-[#111111]/80 border border-white/10 rounded-lg overflow-hidden">
                    <div className="aspect-[16/9] bg-[#222]"></div>
                    <div className="p-4">
                      <div className="h-5 bg-[#333] rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-[#333] rounded w-1/2 mb-4"></div>
                      <div className="flex items-center mb-2">
                        <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                        <div className="h-3 bg-[#333] rounded w-1/3"></div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                        <div className="h-3 bg-[#333] rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 border border-white/10 rounded-lg">
                <p className="text-lg text-red-400 mb-4">Error loading shows</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : filteredShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShows.map((show: any) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-white/10 rounded-lg">
                <h3 className="text-lg font-medium mb-2">No shows found</h3>
                <p className="text-white/60">
                  Try adjusting your search or browse artists to find shows
                </p>
                <Link 
                  to="/artists" 
                  className="inline-flex items-center text-white hover:underline mt-4"
                >
                  Browse artists
                  <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Shows;
