import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/search-bar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import FeaturedArtists from '@/components/artists/FeaturedArtists';
import ShowsByGenre from '@/components/shows/ShowsByGenre';
import { Badge } from '@/components/ui/badge';

const genres = [
  { id: 'KnvZfZ7vAeA', name: 'Pop' },
  { id: 'KnvZfZ7vAvv', name: 'Rock' },
  { id: 'KnvZfZ7vAva', name: 'Hip-Hop/Rap' },
  { id: 'KnvZfZ7vAvE', name: 'R&B' },
  { id: 'KnvZfZ7vAv6', name: 'Country' },
  { id: 'KnvZfZ7vAev', name: 'Electronic' },
  { id: 'KnvZfZ7vAvl', name: 'Alternative' },
  { id: 'KnvZfZ7vAve', name: 'Classical' },
  { id: 'KnvZfZ7vAvY', name: 'Jazz' },
  { id: 'KnvZfZ7vAka', name: 'Blues' },
  { id: 'KnvZfZ7vAkE', name: 'Folk' },
  { id: 'KnvZfZ7vAkF', name: 'World' },
  { id: 'KnvZfZ7vAkA', name: 'Reggae' },
  { id: 'KnvZfZ7vAee', name: 'Latin' },
  { id: 'KnvZfZ7vAkv', name: 'Metal' },
  { id: 'KnvZfZ7vAej', name: 'Punk' },
  { id: 'KnvZfZ7vAke', name: 'Gospel' },
  { id: 'KnvZfZ7vAky', name: 'New Age' },
  { id: 'KnvZfZ7vA04', name: 'Comedy' },
];

const Artists = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const results = [
        { id: '1', name: `${query} Artist 1`, image: 'https://via.placeholder.com/150' },
        { id: '2', name: `${query} Artist 2`, image: 'https://via.placeholder.com/150' },
        { id: '3', name: `${query} Artist 3`, image: 'https://via.placeholder.com/150' },
      ];
      setSearchResults(results);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="px-6 py-12 md:px-8 lg:px-12 bg-gradient-to-b from-secondary/30 to-background">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">Discover Artists</h1>
            
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search for artists..."
              className="mb-8 max-w-2xl"
            />
            
            {isSearching ? (
              <ArtistSearchResults 
                searchResults={searchResults} 
                isLoading={isLoading}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="space-y-16">
                <FeaturedArtists />
                
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Popular Genres</h2>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
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
                      genreName={genres.find(g => g.id === activeGenre)?.name || ''}
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
