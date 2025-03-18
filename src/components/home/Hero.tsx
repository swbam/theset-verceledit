
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, CalendarDays, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';
import { searchArtistsWithEvents } from '@/lib/api/ticketmaster/artists';
import { useDebounce } from '@/hooks/use-debounce';

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Search for artists when the debounced query changes
  useEffect(() => {
    const fetchArtists = async () => {
      if (debouncedSearchQuery.length < 3) {
        setArtists([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const results = await searchArtistsWithEvents(debouncedSearchQuery);
        setArtists(results.artists || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching for artists:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArtists();
  }, [debouncedSearchQuery]);
  
  const handleSelectArtist = (artistId) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(`/artists/${artistId}`);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };
  
  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-24 md:pb-32 bg-black">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 right-0 h-px bg-white/10"></div>
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] bg-repeat opacity-10"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-block px-6 py-2 mb-6 border border-zinc-800 rounded-full text-sm text-white/80">
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-2"></span>
            <span>Currently 546 fans voting on upcoming shows</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight">
            <span>Vote on setlists</span><br />
            <span>for upcoming concerts</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Help shape the perfect show by voting for your favorite songs. Join thousands of fans influencing what artists play live.
          </p>
          
          <div className="relative mb-8 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for artists with upcoming shows..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-5 py-4 pl-12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all shadow-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            {/* Search results dropdown */}
            {showResults && searchQuery.length >= 3 && (
              <div className="absolute left-0 right-0 mt-2 z-10 max-h-80 overflow-y-auto">
                <ArtistSearchResults
                  artists={artists.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    image: artist.imageUrl,
                    upcomingShows: artist.hasEvents ? 1 : 0
                  }))}
                  isLoading={isLoading}
                  onSelect={handleSelectArtist}
                />
                
                {artists.length > 0 && (
                  <div className="px-4 py-2 text-xs text-zinc-400 bg-zinc-900 border border-t-0 border-zinc-800 rounded-b-lg">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-white p-0 h-auto"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
                    >
                      See all results
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Taylor+Swift')}
            >
              Taylor Swift
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Coldplay')}
            >
              Coldplay
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Bad+Bunny')}
            >
              Bad Bunny
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Beyoncé')}
            >
              Beyoncé
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=The+Weeknd')}
            >
              The Weeknd
            </Button>
          </div>
        </div>
        
        {/* Key benefits section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <Music size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Find Your Shows</h3>
            <p className="text-white/70">Discover upcoming concerts for your favorite artists in your area</p>
          </div>
          
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <ThumbsUp size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Vote on Songs</h3>
            <p className="text-white/70">Help shape the perfect concert by voting on which tracks should be played</p>
          </div>
          
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <CalendarDays size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Share & Connect</h3>
            <p className="text-white/70">See what other fans want to hear and build the ultimate show experience</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
