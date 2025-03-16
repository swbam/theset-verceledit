
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import UserProfile from '@/components/auth/UserProfile';
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = ({ showSearch = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center" onClick={closeMenu}>
          <span className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">TheSet</span>
        </Link>

        {!isHomePage && showSearch && !isMobile && (
          <form onSubmit={handleSearch} className="w-64 hidden md:flex mx-4 relative">
            <Input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            <Button 
              type="submit" 
              variant="ghost" 
              size="icon"
              className="absolute right-0 top-0 h-full"
            >
              <Search size={18} />
            </Button>
          </form>
        )}

        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            {isMenuOpen && (
              <div className="fixed inset-0 top-16 z-50 bg-background animate-in slide-in-from-top-5">
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
                    Shows
                  </Link>
                  <Link
                    to="/how-it-works"
                    className={`text-lg ${isActive('/how-it-works') ? 'font-semibold text-primary' : 'text-foreground'}`}
                    onClick={closeMenu}
                  >
                    How It Works
                  </Link>
                  {!isHomePage && (
                    <form onSubmit={handleSearch} className="mt-2">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search artists..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pr-8"
                        />
                        <Button 
                          type="submit" 
                          variant="ghost" 
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                        >
                          <Search size={18} />
                        </Button>
                      </div>
                    </form>
                  )}
                  <div className="mt-4">
                    <UserProfile />
                  </div>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium ${isActive('/') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
              >
                Home
              </Link>
              <Link
                to="/artists"
                className={`text-sm font-medium ${isActive('/artists') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
              >
                Artists
              </Link>
              <Link
                to="/shows"
                className={`text-sm font-medium ${isActive('/shows') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
              >
                Shows
              </Link>
              <Link
                to="/how-it-works"
                className={`text-sm font-medium ${isActive('/how-it-works') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
              >
                How It Works
              </Link>
            </nav>

            <UserProfile />
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
