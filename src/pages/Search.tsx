
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, MusicIcon } from 'lucide-react';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';
import { useDocumentTitle } from '@/hooks/use-document-title';

const Search = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);
  
  // Set document title
  useDocumentTitle(
    queryParam ? `Search: ${queryParam}` : 'Search',
    queryParam ? `Find artists, shows and venues matching "${queryParam}"` : 'Search for artists with upcoming shows'
  );

  // Update search query when URL parameter changes
  useEffect(() => {
    if (queryParam !== searchQuery) {
      setSearchQuery(queryParam);
      setDebouncedQuery(queryParam);
    }
  }, [queryParam]);

  // Debounce the search query to avoid making too many API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      
      // Update URL if query changes and is different from URL param
      if (searchQuery && searchQuery !== queryParam) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`, { replace: true });
      } else if (!searchQuery && queryParam) {
        // Clear URL param if search is cleared
        navigate('/search', { replace: true });
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, navigate, queryParam]);
  
  // Fetch artists with upcoming shows from Ticketmaster
  const { data: artists = [], isLoading, error } = useQuery({
    queryKey: ['artistsWithEvents', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleArtistSelect = (artist: any) => {
    navigate(`/artists/${artist.id}`);
  };

  const showSearchResults = searchQuery.length > 2 && artists.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Find Artists with Upcoming Shows</h1>
          
          <div className="relative max-w-2xl mx-auto mb-12">
            <SearchBar 
              placeholder="Search for artists with upcoming shows..." 
              onSearch={handleSearch}
              onChange={setSearchQuery}
              className="w-full"
              value={searchQuery}
              disableRedirect={true}
              autoFocus
            >
              {showSearchResults && (
                <ArtistSearchResults 
                  artists={artists} 
                  isLoading={isLoading}
                  onSelect={handleArtistSelect}
                />
              )}
            </SearchBar>
          </div>
          
          {!searchQuery && (
            <div className="text-center p-12 border border-border rounded-xl">
              <SearchIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">Search for artists with upcoming shows</h3>
              <p className="text-muted-foreground">
                Find artists and discover their upcoming concerts
              </p>
            </div>
          )}
          
          {searchQuery.length > 2 && !isLoading && artists.length === 0 && (
            <div className="text-center p-12 border border-border rounded-xl">
              <MusicIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">No artists found</h3>
              <p className="text-muted-foreground">
                Try a different search term or check back later for more shows
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
