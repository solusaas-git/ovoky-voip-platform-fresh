'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CountryData, COUNTRIES } from '@/data/countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CountrySelectorProps {
  value?: string;
  onValueChange: (country: CountryData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({
  value,
  onValueChange,
  placeholder = "Select country",
  disabled = false,
  className
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search query
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.phoneCode.includes(searchQuery)
  );

  // Find selected country
  const selectedCountry = COUNTRIES.find(country => 
    country.code === value || country.name === value
  );

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (country: CountryData) => {
    onValueChange(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange({ name: '', code: '', phoneCode: '', flag: '' });
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          "w-full justify-between font-normal text-left h-11 px-4 py-2",
          !selectedCountry && "text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {selectedCountry ? (
            <>
              <span className="text-lg leading-none">{selectedCountry.flag}</span>
              <span className="font-medium truncate">{selectedCountry.name}</span>
              <span className="text-muted-foreground text-sm">{selectedCountry.phoneCode}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {selectedCountry && !disabled && (
            <span
              className="inline-flex items-center justify-center h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm hover:bg-accent transition-colors"
              onClick={clearSelection}
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border border-border rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
              {searchQuery && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 inline-flex items-center justify-center cursor-pointer rounded-sm hover:bg-accent transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              <div className="py-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      selectedCountry?.code === country.code && "bg-muted"
                    )}
                    onClick={() => handleSelect(country)}
                  >
                    <span className="text-lg leading-none">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{country.name}</div>
                      <div className="text-xs text-muted-foreground">{country.phoneCode}</div>
                    </div>
                    {selectedCountry?.code === country.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No countries found</p>
                <p className="text-xs">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 