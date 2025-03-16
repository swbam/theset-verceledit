
import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';
import UserProfile from '@/components/auth/UserProfile';

interface MobileMenuProps {
  isOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  artists: any[];
  isLoading: boolean;
  handleFullSearch: (query: string) => void;
  handleNavigation: (artistId: string) => void;
  closeMenu: () => void;
}

const MobileMenu = ({
  isOpen,
  searchQuery,
  setSearchQuery,
  artists,
  isLoading,
  handleFullSearch,
  handleNavigation,
  closeMenu
}: MobileMenuProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isHomePage = location.pathname === '/';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-16 z-50 bg-black animate-in slide-in-from-top-5">
      <nav className="container flex flex-col gap-6 p-6">
        <Link
          to="/"
          className={`text-lg ${isActive('/') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Home
        </Link>
        <Link
          to="/artists"
          className={`text-lg ${isActive('/artists') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Artists
        </Link>
        <Link
          to="/shows"
          className={`text-lg ${isActive('/shows') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Upcoming Shows
        </Link>
        <Link
          to="/how-it-works"
          className={`text-lg ${isActive('/how-it-works') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          How It Works
        </Link>
        {!isHomePage && (
          <div className="mt-2">
            <SearchBar
              placeholder="Search artists..."
              onChange={(query) => setSearchQuery(query)}
              onSearch={handleFullSearch}
              value={searchQuery}
              className="w-full"
            >
              {searchQuery.length > 2 && (
                <ArtistSearchResults
                  artists={artists}
                  isLoading={isLoading}
                  onSelect={(artist) => {
                    handleNavigation(artist.id);
                    closeMenu();
                  }}
                />
              )}
            </SearchBar>
          </div>
        )}
        <div className="mt-4">
          <UserProfile />
        </div>
      </nav>
    </div>
  );
};

export default MobileMenu;
