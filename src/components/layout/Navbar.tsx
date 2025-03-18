import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import MobileMenu from './MobileMenu';
import DesktopNav from './DesktopNav';
import NavbarSearch from './NavbarSearch';

const Navbar = ({ showSearch = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isSearchPage = location.pathname === '/search';

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch artist search results
  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['navSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery, 5),
    enabled: debouncedQuery.length > 2,
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleFullSearch = (query: string) => {
    if (query.trim()) {
      // Only navigate if we're not already on the search page
      if (!isSearchPage) {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
      setSearchQuery('');
    }
  };

  const handleNavigation = (artistId: string) => {
    navigate(`/artists/${artistId}`);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black backdrop-blur supports-[backdrop-filter]:bg-black/90">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center" onClick={closeMenu}>
          <span className="text-xl font-semibold text-white">TheSet</span>
        </Link>

        {showSearch && !isMobile && (
          <NavbarSearch 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            artists={artists}
            isLoading={isLoading}
            handleFullSearch={handleFullSearch}
            handleNavigation={handleNavigation}
            isSearchPage={isSearchPage}
          />
        )}

        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              className="text-white hover:bg-zinc-800"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            <MobileMenu 
              isOpen={isMenuOpen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              artists={artists}
              isLoading={isLoading}
              handleFullSearch={handleFullSearch}
              handleNavigation={handleNavigation}
              closeMenu={closeMenu}
              isSearchPage={isSearchPage}
            />
          </>
        ) : (
          <DesktopNav />
        )}
      </div>
    </header>
  );
};

export default Navbar;
