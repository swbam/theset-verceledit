
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import ShowsByGenre from '@/components/artists/ShowsByGenre';
import { Badge } from '@/components/ui/badge';
import { popularMusicGenres } from '@/lib/ticketmaster';

const Artists = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const location = useLocation();
  
  // Determine if we're on the /shows path
  const isShowsPage = location.pathname.startsWith('/shows');
  
  // Set page title based on path
  const pageTitle = isShowsPage ? "Upcoming Shows" : "Discover Artists";

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setIsLoading(true);

    // API call happens in the ArtistSearchResults component
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="px-6 py-12 md:px-8 lg:px-12 bg-gradient-to-b from-secondary/30 to-background">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">{pageTitle}</h1>
            
            <SearchBar 
              onSearch={handleSearch}
              placeholder={isShowsPage ? "Search for shows..." : "Search for artists..."}
              className="mb-8 max-w-2xl"
            />
            
            {isSearching ? (
              <ArtistSearchResults 
                query={searchQuery}
              />
            ) : (
              <div className="space-y-16">
                <FeaturedArtists />
                
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Popular Genres</h2>
                  <div className="flex flex-wrap gap-2">
                    {popularMusicGenres.map((genre) => (
                      <Badge 
                        key={genre.id}
                        variant={activeGenre === genre.id ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => setActiveGenre(genre.id)}
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                  
                  {activeGenre && (
                    <ShowsByGenre 
                      genreId={activeGenre} 
                      genreName={popularMusicGenres.find(g => g.id === activeGenre)?.name || ''}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Artists;
