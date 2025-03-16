
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, MusicIcon } from 'lucide-react';
import { searchArtists } from '@/lib/spotify';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import ArtistCard from '@/components/artist/ArtistCard';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['artistSearch', searchQuery],
    queryFn: () => searchArtists(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const artists = data?.artists?.items || [];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Search Artists</h1>
          
          <SearchBar 
            placeholder="Search for artists..." 
            onSearch={handleSearch} 
            className="max-w-2xl mb-12"
          />
          
          {searchQuery && (
            <div className="mb-6">
              <h2 className="text-lg font-medium">
                {isLoading 
                  ? "Searching..." 
                  : `Results for "${searchQuery}"`
                }
              </h2>
            </div>
          )}
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                  <div className="w-full aspect-square rounded-lg bg-secondary mb-4"></div>
                  <div className="h-5 bg-secondary rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-secondary rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center p-8 border border-border rounded-xl">
              <p className="text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
          ) : artists.length === 0 && searchQuery ? (
            <div className="text-center p-12 border border-border rounded-xl">
              <MusicIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">No artists found</h3>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {artists.map((artist: any) => (
                <div key={artist.id} className="animate-fade-in">
                  <ArtistCard
                    artist={{
                      id: artist.id,
                      name: artist.name,
                      image: artist.images[0]?.url,
                      genres: artist.genres,
                      upcoming_shows: 0  // We'll fetch this later
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {!searchQuery && (
            <div className="text-center p-12 border border-border rounded-xl">
              <SearchIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">Search for your favorite artists</h3>
              <p className="text-muted-foreground">
                Find artists and discover their upcoming shows
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Search;
