
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';
import SearchBar from '../ui/SearchBar';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleSearch = (query: string) => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="px-6 md:px-8 lg:px-12 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center font-semibold text-xl">
            <Music className="h-5 w-5 mr-2 text-primary" />
            <span>TheSet</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              to="/" 
              className={cn(
                "px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                isActive('/') && "bg-muted font-medium"
              )}
            >
              Home
            </Link>
            <Link 
              to="/search" 
              className={cn(
                "px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                isActive('/search') && "bg-muted font-medium"
              )}
            >
              Search
            </Link>
            <Link 
              to="/shows" 
              className={cn(
                "px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                isActive('/shows') && "bg-muted font-medium"
              )}
            >
              Shows
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {!isActive('/search') && (
            <div className="hidden md:block w-64">
              <SearchBar onSearch={handleSearch} className="w-full" />
            </div>
          )}
          
          <div className="border border-border rounded-full px-3 py-1 flex items-center bg-background">
            <span className="text-xs font-medium">Login</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
