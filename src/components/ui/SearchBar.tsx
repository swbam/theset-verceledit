import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onChange?: (query: string) => void;
  className?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
  children?: React.ReactNode;
  value?: string;
  disableRedirect?: boolean;
}

const SearchBar = ({ 
  placeholder = 'Search artists with upcoming shows...', 
  onSearch, 
  onChange,
  className,
  isLoading = false,
  autoFocus = false,
  children,
  value,
  disableRedirect = false
}: SearchBarProps) => {
  const [query, setQuery] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLFormElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
    // Keep dropdown open if redirection is disabled
    if (!disableRedirect) {
      setIsFocused(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    if (onChange) {
      onChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (onChange) {
      onChange(newQuery);
    }
  };

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto focus on mount if needed
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <form 
      ref={searchBarRef}
      onSubmit={handleSearch}
      className={cn(
        "relative group",
        className
      )}
    >
      <div className={cn(
        "flex items-center overflow-hidden transition-all duration-300 ease-in-out",
        "bg-zinc-900 border border-zinc-800 rounded-full",
        isFocused && "border-zinc-600 ring-2 ring-zinc-700/40"
      )}>
        <button
          type="submit"
          className="pl-4"
          aria-label="Search"
        >
          <Search 
            size={18} 
            className={cn(
              "text-zinc-400 transition-colors",
              isFocused && "text-white",
              isLoading && "animate-pulse"
            )} 
          />
        </button>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="py-3 px-3 w-full bg-transparent focus:outline-none text-white placeholder:text-zinc-400"
          aria-label="Search"
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="pr-4 text-zinc-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {isFocused && children && (
        <div className="absolute left-0 right-0 mt-2 z-10 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg overflow-hidden">
          {children}
        </div>
      )}
    </form>
  );
};

export default SearchBar;
