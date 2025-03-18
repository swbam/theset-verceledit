import React from 'react';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';

interface NavbarSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  artists: any[];
  isLoading: boolean;
  handleFullSearch: (query: string) => void;
  handleNavigation: (artistId: string) => void;
  isSearchPage?: boolean;
}

const NavbarSearch = ({
  searchQuery,
  setSearchQuery,
  artists,
  isLoading,
  handleFullSearch,
  handleNavigation,
  isSearchPage = false
}: NavbarSearchProps) => {
  return (
    <div className="w-64 md:w-80 mx-4 relative">
      <SearchBar
        placeholder="Search artists..."
        onChange={(query) => setSearchQuery(query)}
        onSearch={handleFullSearch}
        value={searchQuery}
        className="w-full"
        disableRedirect={isSearchPage}
      >
        {/* Only show results when query is non-empty and we have results or are loading */}
        {searchQuery.length > 2 && (artists.length > 0 || isLoading) ? (
          <ArtistSearchResults
            artists={artists}
            isLoading={isLoading}
            onSelect={(artist) => {
              handleNavigation(artist.id);
              setSearchQuery('');
            }}
          />
        ) : searchQuery.length > 2 && !isLoading ? (
          <div className="px-4 py-3 text-sm text-zinc-400">
            No artists found with upcoming shows. Try a different search.
          </div>
        ) : null}
      </SearchBar>
    </div>
  );
};

export default NavbarSearch;
