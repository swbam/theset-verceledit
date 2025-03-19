
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: string;
  className?: string;
  children?: ReactNode;
  disableRedirect?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search for artists...",
  onChange,
  value,
  className = "",
  children,
  disableRedirect = false
}) => {
  const [query, setQuery] = useState(value || '');
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange?.(newValue);
    setShowResults(newValue.length > 0);
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim() && !disableRedirect) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      searchContainerRef.current &&
      !searchContainerRef.current.contains(e.target as Node)
    ) {
      setShowResults(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={searchContainerRef}
      className={`relative w-full ${className}`}
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 w-full"
        />
        
        {query && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      
      {children && showResults && (
        <div className="absolute w-full z-50 mt-1 max-h-[70vh] overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
