'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X, Plus } from 'lucide-react';
import { CountryData, COUNTRIES } from '@/data/countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MultiCountrySelectorProps {
  values: string[];
  onValuesChange: (countries: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
}

export function MultiCountrySelector({
  values = [],
  onValuesChange,
  placeholder = "Select countries",
  disabled = false,
  className,
  maxHeight = "300px"
}: MultiCountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search query
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.phoneCode.includes(searchQuery)
  ).filter(country => !values.includes(country.name)); // Exclude already selected

  // Get selected countries data
  const selectedCountries = COUNTRIES.filter(country => 
    values.includes(country.name)
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
    if (!values.includes(country.name)) {
      onValuesChange([...values, country.name]);
    }
    setSearchQuery('');
  };

  const handleRemove = (countryName: string) => {
    onValuesChange(values.filter(name => name !== countryName));
  };

  const handleClearAll = () => {
    onValuesChange([]);
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Main Button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          "w-full justify-between font-normal text-left min-h-11 h-auto px-4 py-2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0">
          {values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedCountries.slice(0, 3).map((country) => (
                <Badge 
                  key={country.code} 
                  variant="secondary" 
                  className="text-xs font-medium flex items-center gap-1.5 pr-1"
                >
                  <span className="text-sm leading-none">{country.flag}</span>
                  <span className="truncate max-w-20">{country.name}</span>
                  <span
                    className="inline-flex items-center justify-center h-4 w-4 p-0 cursor-pointer rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(country.name);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
              {values.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{values.length - 3} more
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {values.length > 0 && !disabled && (
            <span
              className="inline-flex items-center justify-center h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
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
                placeholder="Search countries to add..."
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

          {/* Selected Countries (if any) */}
          {values.length > 0 && (
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Selected ({values.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCountries.map((country) => (
                  <Badge 
                    key={country.code} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1.5 pr-1"
                  >
                    <span className="text-sm leading-none">{country.flag}</span>
                    <span>{country.name}</span>
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 p-0 cursor-pointer rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(country.name);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Countries List */}
          <div 
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {filteredCountries.length > 0 ? (
              <div className="py-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(country)}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg leading-none">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{country.name}</div>
                      <div className="text-xs text-muted-foreground">{country.phoneCode}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No countries found</p>
                    <p className="text-xs">Try adjusting your search</p>
                  </>
                ) : (
                  <>
                    <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All countries selected</p>
                    <p className="text-xs">Remove some to add others</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 