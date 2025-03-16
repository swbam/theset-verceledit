
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out px-6 md:px-8 lg:px-12',
        isScrolled
          ? 'py-3 bg-background/80 backdrop-blur-md border-b border-border'
          : 'py-5 bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link 
          to="/" 
          className="text-2xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          TheSet
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/artists" className="text-foreground/80 hover:text-foreground transition-colors">
            Artists
          </Link>
          <Link to="/shows" className="text-foreground/80 hover:text-foreground transition-colors">
            Shows
          </Link>
        </nav>

        <div className="flex items-center space-x-5">
          <button 
            className="p-2 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          
          <button 
            className="p-2 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label="User profile"
          >
            <User size={20} />
          </button>
          
          <button 
            className="md:hidden p-2 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={cn(
          'fixed inset-0 bg-background z-40 pt-20 px-6 md:hidden transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <nav className="flex flex-col space-y-6 text-lg">
          <Link 
            to="/" 
            className="py-3 border-b border-border text-foreground/80 hover:text-foreground transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link 
            to="/artists" 
            className="py-3 border-b border-border text-foreground/80 hover:text-foreground transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Artists
          </Link>
          <Link 
            to="/shows" 
            className="py-3 border-b border-border text-foreground/80 hover:text-foreground transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Shows
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
