
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserProfile from '@/components/auth/UserProfile';
import { useMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useMobile();

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center" onClick={closeMenu}>
          <span className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">TheSet</span>
        </Link>

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
                    to="/search"
                    className={`text-lg ${isActive('/search') || isActive('/artists') ? 'font-semibold text-primary' : 'text-foreground'}`}
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
                to="/search"
                className={`text-sm font-medium ${isActive('/search') || isActive('/artists') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
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
