
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const SearchBar = ({ placeholder = 'Search artists or shows...', onSearch, className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const clearSearch = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form 
      onSubmit={handleSearch}
      className={cn(
        "relative group",
        className
      )}
    >
      <div className={cn(
        "flex items-center overflow-hidden transition-all duration-300 ease-in-out",
        "bg-background border border-border rounded-full",
        isFocused && "border-foreground/30 ring-2 ring-foreground/5"
      )}>
        <div className="pl-4">
          <Search 
            size={18} 
            className={cn(
              "text-muted-foreground transition-colors",
              isFocused && "text-foreground"
            )} 
          />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="py-3 px-3 w-full bg-transparent focus:outline-none"
          aria-label="Search"
        />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="pr-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
