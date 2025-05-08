'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
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
  isSearchPage?: boolean;
}

const MobileMenu = ({
  isOpen,
  searchQuery,
  setSearchQuery,
  artists,
  isLoading,
  handleFullSearch,
  handleNavigation,
  closeMenu,
  isSearchPage = false
}: MobileMenuProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const isHomePage = pathname === '/';

  if (!isOpen) return null;

  const handleNavAndClose = (artistId: string) => {
    handleNavigation(artistId);
    setSearchQuery('');
    closeMenu();
  };

  return (
    <div className="fixed inset-0 top-16 z-50 bg-background animate-in slide-in-from-top-5">
      <nav className="container flex flex-col gap-6 p-6">
        <Link
          href="/"
          className={`text-lg ${isActive('/') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Home
        </Link>
        <Link
          href="/artists"
          className={`text-lg ${isActive('/artists') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Artists
        </Link>
        <Link
          href="/shows"
          className={`text-lg ${isActive('/shows') ? 'font-semibold text-primary' : 'text-foreground'}`}
          onClick={closeMenu}
        >
          Upcoming Shows
        </Link>
        <Link
          href="/how-it-works"
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
              onSearch={(query) => {
                handleFullSearch(query);
                closeMenu();
              }}
              value={searchQuery}
              className="w-full"
              disableRedirect={isSearchPage}
            >
              {searchQuery.length > 2 && artists.length > 0 && (
                <div className="bg-background border border-border rounded-md shadow-md">
                  {isLoading ? (
                    <div className="p-4 text-center">Loading artists...</div>
                  ) : artists.length === 0 ? (
                    <div className="p-4 text-center">No artists found</div>
                  ) : (
                    <ul className="max-h-[300px] overflow-y-auto">
                      {artists.map((artist) => (
                        <li key={artist.id}>
                          <button
                            className="w-full p-3 text-left hover:bg-muted flex items-center"
                            onClick={() => handleNavAndClose(artist.id)}
                          >
                            {artist.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
