
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusCircle, 
  Calendar, 
  Search, 
  Music, 
  MapPin, 
  ArrowRight,
  Filter 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { fetchShowsByGenre, popularMusicGenres, fetchFeaturedShows } from '@/lib/ticketmaster';

const Shows = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const genreParam = searchParams.get('genre');
  const artistParam = searchParams.get('artist');
  
  const [selectedGenre, setSelectedGenre] = useState(genreParam || '');
  
  // When URL params change, update state
  useEffect(() => {
    if (genreParam) {
      setSelectedGenre(genreParam);
    }
  }, [genreParam]);
  
  // Fetch shows based on filter criteria
  const { 
    data: shows = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: ['shows', selectedGenre, artistParam],
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
            return fetchShowsByGenre(genreObj.id, 24);
          } 
          return [];
        } else {
          // Default to featured shows if no filters
          return fetchFeaturedShows(24);
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
  const filteredShows = shows.filter((show: any) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      show.name?.toLowerCase().includes(query) ||
      show.artist?.name?.toLowerCase().includes(query) ||
      show.venue?.name?.toLowerCase().includes(query) ||
      show.venue?.city?.toLowerCase().includes(query)
    );
  });
  
  // Generate page title based on filters
  const pageTitle = artistParam 
    ? `Shows for ${artistParam}` 
    : selectedGenre 
      ? `${selectedGenre} Shows` 
      : "Upcoming Shows";
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header section */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="md:w-1/2">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{pageTitle}</h1>
                <p className="md:text-lg opacity-90 mb-6">
                  Browse upcoming concerts and vote on the setlists you want to hear
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Link to="/shows/create">
                    <Button size="lg" className="gap-2">
                      <PlusCircle size={18} />
                      Create Show
                    </Button>
                  </Link>
                  
                  <Link to="/artists">
                    <Button variant="outline" size="lg" className="gap-2 bg-white/10 border-white/20 hover:bg-white/20">
                      <Search size={18} />
                      Find Artists
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="hidden md:block md:w-1/3">
                <div className="relative">
                  <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Music size={24} />
                  </div>
                  <div className="absolute top-12 -right-8 w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                    <Calendar size={28} />
                  </div>
                  <div className="absolute bottom-0 left-12 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div className="h-48 w-full rounded-2xl bg-gradient-to-r from-white/20 to-white/5 backdrop-blur">
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Shows section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div className="flex-1 md:max-w-md">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    type="text"
                    placeholder="Search shows by name, artist, or venue..."
                    className="w-full pl-10 pr-4 py-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-muted-foreground" />
                <Select value={selectedGenre} onValueChange={handleGenreChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Genres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Genres</SelectItem>
                    {popularMusicGenres.map(genre => (
                      <SelectItem key={genre.id} value={genre.name}>{genre.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-4">
                    <div className="animate-pulse space-y-4">
                      <div className="aspect-[16/9] rounded-lg bg-secondary"></div>
                      <div className="h-6 bg-secondary rounded w-3/4"></div>
                      <div className="h-4 bg-secondary rounded w-1/2"></div>
                      <div className="h-4 bg-secondary rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 border border-border rounded-lg">
                <p className="text-lg text-red-500 mb-4">Error loading shows</p>
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
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No shows found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse artists to find shows
                </p>
                <Link 
                  to="/artists" 
                  className="inline-flex items-center text-primary hover:underline mt-4"
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
